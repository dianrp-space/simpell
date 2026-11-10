const express = require('express');
const router = express.Router();
const { Pelanggan, AksesFo, AksesFoNode, AksesVsatStarlink, AksesM2m, AksesVsatTdma, PendingGgn, RecordGgn, Cpe, RadioLinkAp, RadioLinkClient, AksesThirdParty } = require('../models');
const { Op } = require('sequelize');
const ExcelJS = require('exceljs');
const logActivity = require('../utils/activityLogger');
const { isEditor } = require('../middleware/auth');
const { paginate } = require('../utils/paginate');

// List all Pelanggan
router.get('/', async (req, res) => {
    try {
        const { search, status } = req.query;

        const searchWhere = {};
        if (search) {
            searchWhere[Op.or] = [
                { no_jaringan: { [Op.like]: `%${search}%` } },
                { nama_pelanggan: { [Op.like]: `%${search}%` } },
                { alamat: { [Op.like]: `%${search}%` } }
            ];
        }
        const where = { ...searchWhere };
        if (status) {
            where.status = status;
        }

        const grouped = await Pelanggan.count({ where: searchWhere, group: ['status'] });
        const counts = { Active: 0, Inactive: 0, Suspended: 0 };
        let totalCustomers = 0;
        grouped.forEach((row) => {
            const n = Number(row.count) || 0;
            if (Object.prototype.hasOwnProperty.call(counts, row.status)) counts[row.status] = n;
            totalCustomers += n;
        });

        const serviceInclude = [
            { model: AksesFo, as: 'aksesFoList', attributes: ['id'], separate: true },
            { model: AksesVsatStarlink, as: 'vsatStarlinkList', attributes: ['id'], separate: true },
            { model: AksesM2m, as: 'm2mList', attributes: ['id'], separate: true },
            { model: AksesVsatTdma, as: 'vsatTdmaList', attributes: ['id'], separate: true },
            { model: Cpe, as: 'cpeList', attributes: ['id'], separate: true },
            { model: RadioLinkClient, as: 'radioLinkList', attributes: ['id'], separate: true },
            { model: AksesThirdParty, as: 'aksesThirdPartyList', attributes: ['id'], separate: true }
        ];
        const { rows, pagination } = await paginate(Pelanggan, req, {
            where,
            include: serviceInclude,
            order: [['nama_pelanggan', 'ASC']]
        });

        const processedList = rows.map(p => {
            const item = p.toJSON();
            item.activeServices = [];
            if (item.aksesFoList && item.aksesFoList.length > 0) item.activeServices.push('Akses FO');
            if (item.vsatStarlinkList && item.vsatStarlinkList.length > 0) item.activeServices.push('VSAT Starlink');
            if (item.m2mList && item.m2mList.length > 0) item.activeServices.push('M2M');
            if (item.vsatTdmaList && item.vsatTdmaList.length > 0) item.activeServices.push('VSAT TDMA');
            if (item.cpeList && item.cpeList.length > 0) item.activeServices.push('CPE');
            if (item.radioLinkList && item.radioLinkList.length > 0) item.activeServices.push('Radio Link');
            if (item.aksesThirdPartyList && item.aksesThirdPartyList.length > 0) item.activeServices.push('3rd Party');
            return item;
        });

        res.render('pelanggan/index', {
            title: 'Data Pelanggan - SIMPELL',
            pelangganList: processedList,
            pagination,
            totalCustomers,
            activeCustomers: counts.Active,
            inactiveCustomers: counts.Inactive,
            suspendedCustomers: counts.Suspended,
            search: search || '',
            status: status || ''
        });
    } catch (error) {
        console.error('Pelanggan List Error:', error);
        req.flash('error_msg', 'Gagal memuat data pelanggan');
        res.redirect('/');
    }
});

// Export Pelanggan to Excel
router.get('/export', async (req, res) => {
    try {
        const pelangganList = await Pelanggan.findAll({
            include: [
                { model: AksesFo, as: 'aksesFoList', attributes: ['id'] },
                { model: AksesVsatStarlink, as: 'vsatStarlinkList', attributes: ['id'] },
                { model: AksesM2m, as: 'm2mList', attributes: ['id'] },
                { model: AksesVsatTdma, as: 'vsatTdmaList', attributes: ['id'] },
                { model: Cpe, as: 'cpeList', attributes: ['id'] },
                { model: RadioLinkClient, as: 'radioLinkList', attributes: ['id'] },
                { model: AksesThirdParty, as: 'aksesThirdPartyList', attributes: ['id'] }
            ],
            order: [['nama_pelanggan', 'ASC']]
        });

        const workbook = new ExcelJS.Workbook();
        workbook.creator = 'SIMPELL System';
        workbook.created = new Date();

        const sheet = workbook.addWorksheet('Data Pelanggan');

        sheet.columns = [
            { header: 'No Jaringan', key: 'no_jaringan', width: 20 },
            { header: 'Nama Pelanggan', key: 'nama_pelanggan', width: 30 },
            { header: 'Alamat', key: 'alamat', width: 40 },
            { header: 'Kontak', key: 'kontak', width: 20 },
            { header: 'Email', key: 'email', width: 25 },
            { header: 'Status', key: 'status', width: 15 },
            { header: 'Layanan Digunakan', key: 'services', width: 40 },
            { header: 'Keterangan', key: 'keterangan', width: 30 }
        ];

        // Style header
        sheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
        sheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF2563EB' } };

        pelangganList.forEach(p => {
            const item = p.toJSON();
            const services = [];

            if (item.aksesFoList?.length > 0) services.push('Akses FO');
            if (item.vsatStarlinkList?.length > 0) services.push('VSAT Starlink');
            if (item.m2mList?.length > 0) services.push('M2M');
            if (item.vsatTdmaList?.length > 0) services.push('VSAT TDMA');
            if (item.cpeList?.length > 0) services.push('CPE');
            if (item.radioLinkList?.length > 0) services.push('Radio Link');
            if (item.aksesThirdPartyList?.length > 0) services.push('3rd Party');

            sheet.addRow({
                no_jaringan: item.no_jaringan,
                nama_pelanggan: item.nama_pelanggan,
                alamat: item.alamat || '-',
                kontak: item.kontak || '-',
                email: item.email || '-',
                status: item.status,
                services: services.join(', ') || '-',
                keterangan: item.keterangan || '-'
            });
        });

        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', 'attachment; filename=' + 'Data_Pelanggan_' + Date.now() + '.xlsx');

        await workbook.xlsx.write(res);
        res.end();

    } catch (error) {
        console.error('Export Error:', error);
        req.flash('error_msg', 'Gagal export data pelanggan');
        res.redirect('/pelanggan');
    }
});

// Form Create Pelanggan
router.get('/create', isEditor, (req, res) => {
    res.render('pelanggan/form', {
        title: 'Tambah Pelanggan - SIMPELL',
        pelanggan: null,
        isEdit: false
    });
});

// Create Pelanggan
router.post('/create', isEditor, async (req, res) => {
    try {
        const { no_jaringan, nama_pelanggan, alamat, kontak, email, status, keterangan } = req.body;

        // Check if no_jaringan already exists
        const existing = await Pelanggan.findOne({ where: { no_jaringan } });
        if (existing) {
            req.flash('error_msg', 'No Jaringan sudah terdaftar');
            return res.redirect('/pelanggan/create');
        }

        const newPelanggan = await Pelanggan.create({
            no_jaringan,
            nama_pelanggan,
            alamat,
            kontak: (kontak && kontak.trim()) ? kontak : '-',
            email: (email && email.trim()) ? email : '-',
            status: status || 'Active',
            keterangan
        });

        // Log activity
        await logActivity(req, 'CREATE', `Menambah pelanggan baru: ${nama_pelanggan} (${no_jaringan})`, 'pelanggan', newPelanggan.id);

        req.flash('success_msg', 'Pelanggan berhasil ditambahkan');
        res.redirect('/pelanggan');
    } catch (error) {
        console.error('Create Pelanggan Error:', error);
        req.flash('error_msg', 'Gagal menambahkan pelanggan: ' + error.message);
        res.redirect('/pelanggan/create');
    }
});

// Export Customer Details to Excel
router.get('/:id/export', async (req, res) => {
    try {
        const pelanggan = await Pelanggan.findByPk(req.params.id);

        if (!pelanggan) {
            req.flash('error_msg', 'Pelanggan tidak ditemukan');
            return res.redirect('/pelanggan');
        }

        const pelangganId = pelanggan.id;
        const searchCriteria = { pelanggan_id: pelangganId };
        const cpeSearchCriteria = { pelanggan_id: pelangganId };

        const [aksesFoList, vsatStarlinkList, m2mList, vsatTdmaList, pendingGgnList, recordGgnList, cpeList, radioLinkList, aksesThirdPartyList] = await Promise.all([
            AksesFo.findAll({ where: searchCriteria, include: [{ model: AksesFoNode, as: 'nodeInfo' }] }),
            AksesVsatStarlink.findAll({ where: searchCriteria }),
            AksesM2m.findAll({ where: searchCriteria }),
            AksesVsatTdma.findAll({ where: searchCriteria }),
            PendingGgn.findAll({ where: searchCriteria, order: [['tanggal', 'DESC']] }),
            RecordGgn.findAll({ where: searchCriteria, order: [['tanggal', 'DESC']] }),
            Cpe.findAll({ where: cpeSearchCriteria }),
            RadioLinkClient.findAll({ where: cpeSearchCriteria, include: [{ model: RadioLinkAp, as: 'ap', attributes: ['nama_ap'] }] }),
            AksesThirdParty.findAll({ where: cpeSearchCriteria })
        ]);

        const workbook = new ExcelJS.Workbook();
        workbook.creator = 'SIMPELL System';
        workbook.created = new Date();

        // --- Sheet 1: Profil Pelanggan ---
        const sheetProfile = workbook.addWorksheet('Profil Pelanggan');
        sheetProfile.columns = [
            { key: 'label', width: 25 },
            { key: 'value', width: 50 }
        ];

        const addProfileRow = (label, value) => {
            const row = sheetProfile.addRow([label, value]);
            row.getCell(1).font = { bold: true };
        };

        sheetProfile.addRow(['DATA PELANGGAN', '']);
        sheetProfile.getRow(1).font = { bold: true, size: 14, color: { argb: 'FFFFFFFF' } };
        sheetProfile.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF2563EB' } };

        addProfileRow('No Jaringan', pelanggan.no_jaringan);
        addProfileRow('Nama Pelanggan', pelanggan.nama_pelanggan);
        addProfileRow('Alamat', pelanggan.alamat || '-');
        addProfileRow('Kontak', pelanggan.kontak || '-');
        addProfileRow('Email', pelanggan.email || '-');
        addProfileRow('Status', pelanggan.status);
        addProfileRow('Keterangan', pelanggan.keterangan || '-');
        addProfileRow('Tanggal Bergabung', pelanggan.createdAt ? new Date(pelanggan.createdAt).toLocaleDateString() : '-');


        // --- Helper for Service Sheets ---
        const createServiceSheet = (sheetName, data, columns) => {
            if (data && data.length > 0) {
                const sheet = workbook.addWorksheet(sheetName);
                sheet.columns = columns;
                // Header style
                sheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
                sheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4B5563' } }; // Gray

                data.forEach(item => {
                    const row = {};
                    columns.forEach(col => {
                        let val = item[col.key];
                        // Special handling for nested or specific display logic
                        if (col.key === 'nama_node' && item.nodeInfo) val = item.nodeInfo.node;
                        if (col.key === 'nama_ap' && item.ap) val = item.ap.nama_ap;
                        row[col.key] = val || '-';
                    });
                    sheet.addRow(row);
                });
            }
        };

        // --- Sheet: Akses FO ---
        createServiceSheet('Layanan - Akses FO', aksesFoList, [
            { header: 'Node', key: 'nama_node', width: 20 },
            { header: 'Port OLT', key: 'port_olt', width: 15 },
            { header: 'SN Modem', key: 'sn_modem', width: 25 },
            { header: 'Redaman (dB)', key: 'redaman_value', width: 15 },
            { header: 'Bandwidth', key: 'bandwidth', width: 20 },
            { header: 'Keterangan', key: 'keterangan', width: 30 }
        ]);

        // --- Sheet: VSAT Starlink ---
        createServiceSheet('Layanan - Starlink', vsatStarlinkList, [
            { header: 'SN Kit', key: 'sn_kit', width: 25 },
            { header: 'SN Mikrotik', key: 'sn_mikrotik', width: 25 },
            { header: 'No Registrasi Kit', key: 'no_registrasi_kit', width: 25 },
            { header: 'Type', key: 'starlink_type', width: 20 },
            { header: 'Web PRTG', key: 'web_prtg', width: 30 }
        ]);

        // --- Sheet: M2M ---
        createServiceSheet('Layanan - M2M', m2mList, [
            { header: 'No GSM', key: 'no_gsm', width: 20 },
            { header: 'IP Secondary', key: 'ip_secondary', width: 20 },
            { header: 'Kuota', key: 'kuota', width: 15 },
            { header: 'VLAN', key: 'vlan', width: 15 },
            { header: 'Layanan', key: 'layanan', width: 20 },
            { header: 'Detail', key: 'detail', width: 30 }
        ]);

        // --- Sheet: VSAT TDMA ---
        createServiceSheet('Layanan - VSAT TDMA', vsatTdmaList, [
            { header: 'Modem', key: 'modem', width: 20 },
            { header: 'Satelite', key: 'satelite', width: 20 },
            { header: 'Keterangan', key: 'keterangan', width: 30 }
        ]);

        // --- Sheet: Radio Link ---
        createServiceSheet('Layanan - Radio Link', radioLinkList, [
            { header: 'Access Point', key: 'nama_ap', width: 20 },
            { header: 'IP NMS', key: 'ip_nms', width: 20 },
            { header: 'MAC Address', key: 'mac_address', width: 25 },
            { header: 'Frequency', key: 'frequency', width: 15 },
            { header: 'SSID', key: 'ssid', width: 20 }
        ]);

        // --- Sheet: 3rd Party ---
        createServiceSheet('Layanan - 3rd Party', aksesThirdPartyList, [
            { header: 'Provider', key: 'id_provider', width: 20 },
            { header: 'Segment', key: 'id_segment', width: 20 },
            { header: 'Mitra', key: 'nama_mitra', width: 20 },
            { header: 'Bandwidth', key: 'bandwidth', width: 15 },
            { header: 'Sewa/Bulan', key: 'sewa_per_bulan', width: 20 }
        ]);


        // --- Sheet: CPE ---
        createServiceSheet('Perangkat CPE', cpeList, [
            { header: 'SN Perangkat', key: 'sn_perangkat', width: 25 },
            { header: 'MAC Address', key: 'mac_address', width: 25 },
            { header: 'IP WAN', key: 'ip_wan', width: 20 },
            { header: 'Keterangan', key: 'keterangan', width: 30 }
        ]);


        // --- Sheet: Pending GGN ---
        if (pendingGgnList && pendingGgnList.length > 0) {
            const sheet = workbook.addWorksheet('Pending GGN');
            sheet.columns = [
                { header: 'Tanggal', key: 'tanggal', width: 15 },
                { header: 'No Ticket', key: 'no_ticket', width: 20 },
                { header: 'Akses', key: 'akses', width: 15 },
                { header: 'Rincian', key: 'rincian', width: 30 },
                { header: 'Status', key: 'status', width: 15 },
                { header: 'Keterangan', key: 'keterangan', width: 40 },
                { header: 'PJ', key: 'pj', width: 20 }
            ];
            sheet.getRow(1).font = { bold: true };
            sheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF59E0B' } }; // Amber

            pendingGgnList.forEach(item => {
                sheet.addRow({
                    tanggal: item.tanggal ? new Date(item.tanggal).toLocaleDateString() : '-',
                    no_ticket: item.no_ticket || '-',
                    akses: item.akses || '-',
                    rincian: item.rincian || '-',
                    status: item.status || '-',
                    keterangan: item.keterangan || '-',
                    pj: item.pj || '-'
                });
            });
        }

        // --- Sheet: Record GGN ---
        if (recordGgnList && recordGgnList.length > 0) {
            const sheet = workbook.addWorksheet('Record GGN');
            sheet.columns = [
                { header: 'Tanggal', key: 'tanggal', width: 15 },
                { header: 'Case', key: 'case_type', width: 15 },
                { header: 'No Ticket', key: 'no_ticket', width: 20 },
                { header: 'Akses', key: 'akses', width: 15 },
                { header: 'History Kontak', key: 'history_kontak_pic', width: 30 },
                { header: 'RFO', key: 'rfo', width: 40 },
                { header: 'Durasi', key: 'durasi_progress', width: 15 },
                { header: 'PJ', key: 'pj', width: 20 }
            ];
            sheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
            sheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF10B981' } }; // Green

            recordGgnList.forEach(item => {
                sheet.addRow({
                    tanggal: item.tanggal ? new Date(item.tanggal).toLocaleDateString() : '-',
                    case_type: item.case_type || '-',
                    no_ticket: item.no_ticket || '-',
                    akses: item.akses || '-',
                    history_kontak_pic: item.history_kontak_pic || '-',
                    rfo: item.rfo || '-',
                    durasi_progress: item.durasi_progress || '-',
                    pj: item.pj || '-'
                });
            });
        }


        // Response
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', 'attachment; filename=' + `${pelanggan.nama_pelanggan}_FullData.xlsx`);

        await workbook.xlsx.write(res);
        res.end();

    } catch (error) {
        console.error('Export Detail Error:', error);
        req.flash('error_msg', 'Gagal export detail pelanggan');
        res.redirect(`/pelanggan/${req.params.id}`);
    }
});

// Detail Pelanggan (with all services)
router.get('/:id', async (req, res) => {
    try {
        const pelanggan = await Pelanggan.findByPk(req.params.id);

        if (!pelanggan) {
            req.flash('error_msg', 'Pelanggan tidak ditemukan');
            return res.redirect('/pelanggan');
        }

        // Fetch all related services using pelanggan_id
        const pelangganId = pelanggan.id;
        const searchCriteria = { pelanggan_id: pelangganId };
        const cpeSearchCriteria = { pelanggan_id: pelangganId };

        const [aksesFoList, vsatStarlinkList, m2mList, vsatTdmaList, pendingGgnList, recordGgnList, cpeList, radioLinkList, aksesThirdPartyList] = await Promise.all([
            AksesFo.findAll({
                where: searchCriteria,
                include: [{ model: AksesFoNode, as: 'nodeInfo' }]
            }),
            AksesVsatStarlink.findAll({
                where: searchCriteria
            }),
            AksesM2m.findAll({
                where: searchCriteria
            }),
            AksesVsatTdma.findAll({
                where: searchCriteria
            }),
            PendingGgn.findAll({
                where: searchCriteria,
                order: [['tanggal', 'DESC']]
            }),
            RecordGgn.findAll({
                where: searchCriteria,
                order: [['tanggal', 'DESC']]
            }),
            Cpe.findAll({
                where: cpeSearchCriteria
            }),
            RadioLinkClient.findAll({
                where: cpeSearchCriteria,
                include: [{ model: RadioLinkAp, as: 'ap', attributes: ['id', 'nama_ap'] }]
            }),
            AksesThirdParty.findAll({
                where: cpeSearchCriteria
            })
        ]);

        res.render('pelanggan/detail', {
            title: `${pelanggan.nama_pelanggan} - SIMPELL`,
            pelanggan,
            aksesFoList,
            vsatStarlinkList,
            m2mList,
            vsatTdmaList,
            pendingGgnList,
            recordGgnList,

            cpeList,
            radioLinkList,
            aksesThirdPartyList
        });
    } catch (error) {
        console.error('Pelanggan Detail Error:', error);
        req.flash('error_msg', 'Gagal memuat detail pelanggan');
        res.redirect('/pelanggan');
    }
});

// Form Edit Pelanggan
router.get('/:id/edit', isEditor, async (req, res) => {
    try {
        const pelanggan = await Pelanggan.findByPk(req.params.id);

        if (!pelanggan) {
            req.flash('error_msg', 'Pelanggan tidak ditemukan');
            return res.redirect('/pelanggan');
        }

        res.render('pelanggan/form', {
            title: 'Edit Pelanggan - SIMPELL',
            pelanggan,
            isEdit: true
        });
    } catch (error) {
        console.error('Edit Pelanggan Error:', error);
        req.flash('error_msg', 'Gagal memuat form edit');
        res.redirect('/pelanggan');
    }
});

// Update Pelanggan
router.post('/:id/edit', isEditor, async (req, res) => {
    try {
        const pelanggan = await Pelanggan.findByPk(req.params.id);

        if (!pelanggan) {
            req.flash('error_msg', 'Pelanggan tidak ditemukan');
            return res.redirect('/pelanggan');
        }

        const { no_jaringan, nama_pelanggan, alamat, kontak, email, status, keterangan } = req.body;

        // Check if new no_jaringan conflicts with another record
        if (no_jaringan !== pelanggan.no_jaringan) {
            const existing = await Pelanggan.findOne({ where: { no_jaringan } });
            if (existing) {
                req.flash('error_msg', 'No Jaringan sudah terdaftar');
                return res.redirect(`/pelanggan/${req.params.id}/edit`);
            }
        }

        await pelanggan.update({
            no_jaringan,
            nama_pelanggan,
            alamat,
            kontak: (kontak && kontak.trim()) ? kontak : '-',
            email: (email && email.trim()) ? email : '-',
            status,
            keterangan
        });

        // Log activity
        await logActivity(req, 'UPDATE', `Memperbarui data pelanggan: ${nama_pelanggan} (${no_jaringan})`, 'pelanggan', pelanggan.id);

        req.flash('success_msg', 'Pelanggan berhasil diupdate');
        res.redirect(`/pelanggan/${req.params.id}`);
    } catch (error) {
        console.error('Update Pelanggan Error:', error);
        req.flash('error_msg', 'Gagal mengupdate pelanggan: ' + error.message);
        res.redirect(`/pelanggan/${req.params.id}/edit`);
    }
});

// Delete Pelanggan
router.post('/:id/delete', isEditor, async (req, res) => {
    try {
        const pelanggan = await Pelanggan.findByPk(req.params.id);

        if (!pelanggan) {
            req.flash('error_msg', 'Pelanggan tidak ditemukan');
            return res.redirect('/pelanggan');
        }

        const namaPelanggan = pelanggan.nama_pelanggan;
        const noJaringan = pelanggan.no_jaringan;
        await pelanggan.destroy();

        // Log activity
        await logActivity(req, 'DELETE', `Menghapus pelanggan: ${namaPelanggan} (${noJaringan})`, 'pelanggan', req.params.id);

        req.flash('success_msg', 'Pelanggan berhasil dihapus');
        res.redirect('/pelanggan');
    } catch (error) {
        console.error('Delete Pelanggan Error:', error);
        req.flash('error_msg', 'Gagal menghapus pelanggan');
        res.redirect('/pelanggan');
    }
});

// API: Get Pelanggan for autocomplete
router.get('/api/search', async (req, res) => {
    try {
        const { q } = req.query;
        if (!q || q.length < 2) {
            return res.json([]);
        }

        const results = await Pelanggan.findAll({
            where: {
                [Op.or]: [
                    { no_jaringan: { [Op.like]: `%${q}%` } },
                    { nama_pelanggan: { [Op.like]: `%${q}%` } }
                ]
            },
            attributes: ['id', 'no_jaringan', 'nama_pelanggan'],
            limit: 10
        });

        res.json(results);
    } catch (error) {
        console.error('Pelanggan Search API Error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

module.exports = router;
