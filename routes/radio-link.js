const express = require('express');
const router = express.Router();
const RadioLinkAp = require('../models/RadioLinkAp');
const RadioLinkClient = require('../models/RadioLinkClient');
const Pelanggan = require('../models/Pelanggan');
const { Op } = require('sequelize');
const ExcelJS = require('exceljs');
const { pageState, pageMeta } = require('../utils/paginate');

// GET - Export Excel (Must be before dynamic /:id route)
router.get('/export', async (req, res) => {
    try {
        const { search } = req.query;
        let where = {};

        // Base include to fetch Clients and their Pelanggan
        let include = [{
            model: RadioLinkClient,
            as: 'clients',
            include: [{ model: Pelanggan, as: 'pelanggan' }]
        }];

        if (search) {
            where = {
                [Op.or]: [
                    { nama_ap: { [Op.like]: `%${search}%` } },
                    { '$clients.pelanggan.no_jaringan$': { [Op.like]: `%${search}%` } },
                    { '$clients.pelanggan.nama_pelanggan$': { [Op.like]: `%${search}%` } },
                    { ip_nms: { [Op.like]: `%${search}%` } },
                    { '$clients.ip_nms$': { [Op.like]: `%${search}%` } },
                    { '$clients.mac_address$': { [Op.like]: `%${search}%` } },
                    { '$clients.ssid$': { [Op.like]: `%${search}%` } }
                ]
            };
        }

        const aps = await RadioLinkAp.findAll({
            where,
            include,
            order: [['nama_ap', 'ASC']]
        });

        const workbook = new ExcelJS.Workbook();

        // Loop through APs and create a sheet for each
        if (aps.length === 0) {
            workbook.addWorksheet('No Data');
        } else {
            aps.forEach(ap => {
                // Sanitize sheet name (remove invalid chars, max 31 chars)
                let sheetName = ap.nama_ap.replace(/[*?:\/\[\]]/g, '').substring(0, 31) || 'AP';
                // Ensure unique sheet name
                let counter = 1;
                while (workbook.getWorksheet(sheetName)) {
                    sheetName = sheetName.substring(0, 28) + `_${counter}`;
                    counter++;
                }

                const sheet = workbook.addWorksheet(sheetName);

                // --- AP Detail Header Section ---
                sheet.mergeCells('A1:B1'); sheet.getCell('A1').value = 'Access Point'; sheet.getCell('A1').font = { bold: true };
                sheet.mergeCells('C1:D1'); sheet.getCell('C1').value = ap.nama_ap;

                sheet.mergeCells('A2:B2'); sheet.getCell('A2').value = 'IP NMS';
                sheet.mergeCells('C2:D2'); sheet.getCell('C2').value = ap.ip_nms || '-';

                sheet.mergeCells('A3:B3'); sheet.getCell('A3').value = 'MAC / SSID';
                sheet.mergeCells('C3:D3'); sheet.getCell('C3').value = `${ap.mac_address || '-'} / ${ap.ssid || '-'}`;

                sheet.mergeCells('A4:B4'); sheet.getCell('A4').value = 'Frequency / BW';
                sheet.mergeCells('C4:D4'); sheet.getCell('C4').value = `${ap.frequency || '-'} / ${ap.channel_bandwidth || '-'}`;

                sheet.mergeCells('A5:B5'); sheet.getCell('A5').value = 'Coordinate';
                sheet.mergeCells('C5:D5'); sheet.getCell('C5').value = `${ap.latitude || '-'}, ${ap.longitude || '-'}`;

                // Spacer
                sheet.addRow([]);

                // --- Client Table Header ---
                const startRow = 7;
                const headerRow = sheet.getRow(startRow);
                headerRow.values = [
                    'No', 'No Jaringan', 'Customer', 'IP NMS', 'MAC Address', 'SSID',
                    'Signal/Power', 'Distance', 'Throughput', 'Keterangan'
                ];

                // Column definitions (widths)
                sheet.columns = [
                    { key: 'no', width: 5 },
                    { key: 'no_jaringan', width: 20 },
                    { key: 'customer', width: 30 },
                    { key: 'ip_nms', width: 18 },
                    { key: 'mac_address', width: 20 },
                    { key: 'ssid', width: 20 },
                    { key: 'signal', width: 15 },
                    { key: 'distance', width: 15 },
                    { key: 'throughput', width: 15 },
                    { key: 'keterangan', width: 30 }
                ];

                // Header Style
                headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
                headerRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4B5563' } };

                // Add Clients
                if (ap.clients && ap.clients.length > 0) {
                    ap.clients.forEach((client, idx) => {
                        const row = sheet.addRow({
                            no: idx + 1,
                            no_jaringan: client.pelanggan ? client.pelanggan.no_jaringan : '-',
                            customer: client.pelanggan ? client.pelanggan.nama_pelanggan : '-',
                            ip_nms: client.ip_nms || '',
                            mac_address: client.mac_address || '',
                            ssid: client.ssid || '',
                            signal: client.power || '-', // Using power as signal proxy
                            distance: '', // Placeholder
                            throughput: '', // Placeholder
                            keterangan: ''
                        });

                        if ((idx + 1) % 2 === 0) {
                            row.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF9FAFB' } };
                        }
                    });
                } else {
                    sheet.addRow(['No clients data']);
                }
            });
        }

        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', 'attachment; filename=RadioLink_Full_' + new Date().toISOString().slice(0, 10) + '.xlsx');

        await workbook.xlsx.write(res);
        res.end();

    } catch (error) {
        console.error('Export Error:', error);
        req.flash('error_msg', 'Gagal export data');
        res.redirect('/radio-link');
    }
});

// GET /radio-link (List APs)
router.get('/', async (req, res) => {
    try {
        const { search } = req.query;
        let where = {};

        if (search) {
            where = {
                [Op.or]: [
                    { nama_ap: { [Op.like]: `%${search}%` } },
                    { '$clients.pelanggan.no_jaringan$': { [Op.like]: `%${search}%` } },
                    { '$clients.pelanggan.nama_pelanggan$': { [Op.like]: `%${search}%` } },
                    { ip_nms: { [Op.like]: `%${search}%` } },
                    { '$clients.ip_nms$': { [Op.like]: `%${search}%` } },
                    { '$clients.mac_address$': { [Op.like]: `%${search}%` } },
                    { '$clients.ssid$': { [Op.like]: `%${search}%` } },
                    { '$clients.username$': { [Op.like]: `%${search}%` } }
                ]
            };
        }

        const { page, limit, offset } = pageState(req);
        const filterInclude = search ? [{
            model: RadioLinkClient,
            as: 'clients',
            attributes: [],
            required: false,
            include: [{ model: Pelanggan, as: 'pelanggan', attributes: [], required: false }]
        }] : [];
        const total = await RadioLinkAp.count({
            where,
            include: filterInclude.length ? filterInclude : undefined,
            distinct: true,
            col: 'id'
        });
        const idQuery = {
            attributes: ['id', 'nama_ap'],
            where,
            order: [['nama_ap', 'ASC']],
            limit,
            offset
        };
        if (filterInclude.length) {
            idQuery.include = filterInclude;
            idQuery.subQuery = false;
            idQuery.group = ['RadioLinkAp.id', 'RadioLinkAp.nama_ap'];
        }
        const idRows = await RadioLinkAp.findAll(idQuery);
        const ids = idRows.map(row => row.id);
        const data = ids.length ? await RadioLinkAp.findAll({
            where: { id: { [Op.in]: ids } },
            include: [{
                model: RadioLinkClient,
                as: 'clients',
                separate: true,
                include: [{ model: Pelanggan, as: 'pelanggan' }]
            }],
            order: [['nama_ap', 'ASC']]
        }) : [];

        res.render('radio-link/index', {
            title: 'Radio Link - SIMPELL',
            data,
            pagination: pageMeta(req, total, page, limit),
            search // Pass search term to view
        });
    } catch (error) {
        console.error(error);
        req.flash('error_msg', 'Gagal memuat data Radio Link');
        res.redirect('/dashboard');
    }
});

// GET /radio-link/create (Form AP)
router.get('/create', (req, res) => {
    res.render('radio-link/form-ap', {
        title: 'Tambah AP - Radio Link',
        data: null
    });
});

// POST /radio-link (Store AP)
router.post('/', async (req, res) => {
    try {
        await RadioLinkAp.create(req.body);
        req.flash('success_msg', 'Access Point berhasil ditambahkan');
        res.redirect('/radio-link');
    } catch (error) {
        console.error(error);
        req.flash('error_msg', 'Gagal menambah AP');
        res.redirect('/radio-link/create');
    }
});

// GET /radio-link/:id (Detail AP & List Clients)
router.get('/:id', async (req, res) => {
    try {
        const { search } = req.query;

        // 1. Fetch the Access Point first
        const ap = await RadioLinkAp.findByPk(req.params.id);
        if (!ap) return res.redirect('/radio-link');

        // 2. Build where clause for Clients
        let clientWhere = {
            radio_link_ap_id: req.params.id
        };

        if (search) {
            clientWhere[Op.or] = [
                { '$pelanggan.no_jaringan$': { [Op.like]: `%${search}%` } },
                { '$pelanggan.nama_pelanggan$': { [Op.like]: `%${search}%` } },
                { ip_nms: { [Op.like]: `%${search}%` } },
                { mac_address: { [Op.like]: `%${search}%` } },
                { ssid: { [Op.like]: `%${search}%` } },
                { username: { [Op.like]: `%${search}%` } },
                { latitude: { [Op.like]: `%${search}%` } },
                { longitude: { [Op.like]: `%${search}%` } }
            ];
        }

        // 3. Fetch Clients with Pelanggan data
        const clientsRaw = await RadioLinkClient.findAll({
            where: clientWhere,
            include: [{ model: Pelanggan, as: 'pelanggan' }],
            order: [['created_at', 'DESC']],
            subQuery: false
        });

        // 4. Prepare data for the template (Plan JS objects are safest for EJS)
        const clients = clientsRaw.map(c => c.get({ clone: true }));
        const apData = ap.get({ clone: true });
        apData.clients = clients;

        res.render('radio-link/detail', {
            title: `Detail ${apData.nama_ap}`,
            data: apData,
            data: apData,
            search
        });
    } catch (error) {
        console.error('Error on Radio Link detail search:', error);
        res.redirect('/radio-link');
    }
});

// GET /radio-link/:id/edit (Edit AP)
router.get('/:id/edit', async (req, res) => {
    try {
        const data = await RadioLinkAp.findByPk(req.params.id);
        res.render('radio-link/form-ap', {
            title: 'Edit AP',
            data,
            title: 'Edit AP',
            data
        });
    } catch (error) {
        res.redirect('/radio-link');
    }
});

// PUT /radio-link/:id (Update AP)
router.put('/:id', async (req, res) => {
    try {
        await RadioLinkAp.update(req.body, { where: { id: req.params.id } });
        req.flash('success_msg', 'AP berhasil diperbarui');
        res.redirect('/radio-link');
    } catch (error) {
        res.redirect(`/radio-link/${req.params.id}/edit`);
    }
});

// DELETE /radio-link/:id (Destroy AP)
router.delete('/:id', async (req, res) => {
    try {
        await RadioLinkAp.destroy({ where: { id: req.params.id } });
        req.flash('success_msg', 'AP berhasil dihapus');
        res.redirect('/radio-link');
    } catch (error) {
        res.redirect('/radio-link');
    }
});

// --- CLIENT ROUTES ---

// GET /radio-link/:id/client/create (Form Client)
router.get('/:id/client/create', async (req, res) => {
    try {
        const ap = await RadioLinkAp.findByPk(req.params.id);
        const pelangganList = await Pelanggan.findAll({
            attributes: ['id', 'nama_pelanggan', 'no_jaringan'],
            where: { status: 'Active' },
            order: [['nama_pelanggan', 'ASC']]
        });
        res.render('radio-link/form-client', {
            title: 'Tambah Client',
            ap,
            clientData: null,
            pelangganList,
            clientData: null,
            pelangganList
        });
    } catch (error) {
        res.redirect('/radio-link');
    }
});

// POST /radio-link/:id/client (Store Client)
router.post('/:id/client', async (req, res) => {
    try {
        const payload = {
            ...req.body,
            radio_link_ap_id: req.params.id
        };
        await RadioLinkClient.create(payload);
        req.flash('success_msg', 'Client berhasil ditambahkan');
        res.redirect(`/radio-link/${req.params.id}`);
    } catch (error) {
        console.error(error);
        res.redirect(`/radio-link/${req.params.id}/client/create`);
    }
});

// GET /radio-link/:id/client/:clientId/edit (Edit Client)
router.get('/:id/client/:clientId/edit', async (req, res) => {
    try {
        const ap = await RadioLinkAp.findByPk(req.params.id);
        const client = await RadioLinkClient.findByPk(req.params.clientId, { include: ['pelanggan'] });
        const pelangganList = await Pelanggan.findAll({
            attributes: ['id', 'nama_pelanggan', 'no_jaringan'],
            where: { status: 'Active' },
            order: [['nama_pelanggan', 'ASC']]
        });

        res.render('radio-link/form-client', {
            title: 'Edit Client',
            ap: ap ? ap.toJSON() : null, // Sanitize
            clientData: client ? client.toJSON() : null, // Sanitize to avoid EJS conflicts
            pelangganList: pelangganList.map(p => p.toJSON()), // Sanitize
            pelangganList: pelangganList.map(p => p.toJSON()), // Sanitize
            returnUrl: req.query.return_url
        });
    } catch (error) {
        console.error(error);
        res.redirect(`/radio-link/${req.params.id}`);
    }
});

// PUT /radio-link/:id/client/:clientId (Update Client)
router.put('/:id/client/:clientId', async (req, res) => {
    try {
        await RadioLinkClient.update(req.body, { where: { id: req.params.clientId } });
        req.flash('success_msg', 'Client berhasil diperbarui');
        if (req.query.return_url) {
            return res.redirect(req.query.return_url);
        }
        res.redirect(`/radio-link/${req.params.id}`);
    } catch (error) {
        res.redirect(`/radio-link/${req.params.id}/client/${req.params.clientId}/edit`);
    }
});

// DELETE /radio-link/client/:clientId (Destroy Client)
router.delete('/client/:clientId', async (req, res) => {
    try {
        const client = await RadioLinkClient.findByPk(req.params.clientId);
        const apId = client.radio_link_ap_id;
        await client.destroy();
        req.flash('success_msg', 'Client berhasil dihapus');
        if (req.query.return_url) {
            return res.redirect(req.query.return_url);
        }
        res.redirect(`/radio-link/${apId}`);
    } catch (error) {
        // Fallback if we can't find the client to redirect back properly, just go to list
        res.redirect('/radio-link');
    }
});

// GET /radio-link/client/:clientId (Client Detail)
router.get('/client/:clientId', async (req, res) => {
    try {
        const client = await RadioLinkClient.findByPk(req.params.clientId, {
            include: [
                { model: RadioLinkAp, as: 'ap' },
                { model: Pelanggan, as: 'pelanggan' }
            ]
        });

        if (!client) {
            req.flash('error_msg', 'Client tidak ditemukan');
            return res.redirect('/radio-link');
        }

        res.render('radio-link/client-detail', {
            title: 'Detail Client Radio Link',
            ap: client.ap,
            clientData: client.toJSON(),
            ap: client.ap,
            clientData: client.toJSON()
        });
    } catch (error) {
        console.error(error);
        res.redirect('/radio-link');
    }
});

module.exports = router;
