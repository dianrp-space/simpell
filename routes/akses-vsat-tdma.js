const express = require('express');
const router = express.Router();
const { AksesVsatTdma, Pelanggan } = require('../models');
const { Op } = require('sequelize');
const { isEditor } = require('../middleware/auth');
const ExcelJS = require('exceljs');
const { paginate } = require('../utils/paginate');

// GET - Export Excel (Must be before dynamic /:id route)
router.get('/export', async (req, res) => {
    try {
        const { search } = req.query;
        let where = {};
        if (search) {
            where = {
                [Op.or]: [
                    { '$pelanggan.nama_pelanggan$': { [Op.like]: `%${search}%` } },
                    { '$pelanggan.no_jaringan$': { [Op.like]: `%${search}%` } }
                ]
            };
        }

        const data = await AksesVsatTdma.findAll({
            where,
            include: [{ model: Pelanggan, as: 'pelanggan' }],
            order: [['created_at', 'DESC']]
        });

        const workbook = new ExcelJS.Workbook();
        const sheet = workbook.addWorksheet('Data VSAT TDMA');

        // Table Header
        sheet.getRow(1).values = [
            'No', 'No Jaringan', 'Customer', 'Modem', 'Satelite', 'Keterangan'
        ];

        sheet.columns = [
            { key: 'no', width: 5 },
            { key: 'no_jaringan', width: 20 },
            { key: 'customer', width: 30 },
            { key: 'modem', width: 20 },
            { key: 'satelite', width: 20 },
            { key: 'keterangan', width: 30 }
        ];

        // Header Style
        const headerRow = sheet.getRow(1);
        headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
        headerRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4B5563' } };

        data.forEach((item, index) => {
            const row = sheet.addRow({
                no: index + 1,
                no_jaringan: item.pelanggan ? item.pelanggan.no_jaringan : '-',
                customer: item.pelanggan ? item.pelanggan.nama_pelanggan : '-',
                modem: item.modem || '',
                satelite: item.satelite || '',
                keterangan: item.keterangan || ''
            });

            // Alternating Row Color
            if ((index + 1) % 2 === 0) {
                row.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF9FAFB' } };
            }
        });

        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', 'attachment; filename=VSAT_TDMA_Full_' + new Date().toISOString().slice(0, 10) + '.xlsx');

        await workbook.xlsx.write(res);
        res.end();

    } catch (error) {
        console.error('Export Error:', error);
        req.flash('error_msg', 'Gagal export data');
        res.redirect('/akses-vsat-tdma');
    }
});

router.get('/', async (req, res) => {
    try {
        const { search } = req.query;
        let where = {};
        if (search) {
            where = {
                [Op.or]: [
                    { '$pelanggan.nama_pelanggan$': { [Op.like]: `%${search}%` } },
                    { '$pelanggan.no_jaringan$': { [Op.like]: `%${search}%` } }
                ]
            };
        }
        const { rows, pagination } = await paginate(AksesVsatTdma, req, {
            where,
            include: [{ model: Pelanggan, as: 'pelanggan' }],
            order: [['created_at', 'DESC']],
            subQuery: false
        });
        res.render('akses-vsat-tdma/index', { title: 'VSAT TDMA/SCPC - SIMPELL', data: rows, pagination, search: search || '' });
    } catch (error) {
        console.error(error);
        req.flash('error_msg', 'Gagal memuat data');
        res.redirect('/');
    }
});

router.get('/create', isEditor, async (req, res) => {
    const modems = await AksesVsatTdma.findAll({ attributes: ['modem'], group: ['modem'], raw: true });
    const satelites = await AksesVsatTdma.findAll({ attributes: ['satelite'], group: ['satelite'], raw: true });

    const pelangganList = await Pelanggan.findAll({
        attributes: ['id', 'no_jaringan', 'nama_pelanggan'],
        order: [['nama_pelanggan', 'ASC']]
    });

    res.render('akses-vsat-tdma/form', {
        title: 'Tambah VSAT TDMA - SIMPELL',
        data: null,
        modems: modems.map(m => m.modem).filter(Boolean),
        satelites: satelites.map(s => s.satelite).filter(Boolean),
        pelangganList
    });
});

router.post('/', isEditor, async (req, res) => {
    try {
        const payload = req.body;
        // pelanggan_id is expected to be in req.body from the form select

        await AksesVsatTdma.create(payload);
        req.flash('success_msg', 'Data berhasil ditambahkan');
        res.redirect('/akses-vsat-tdma');
    }
    catch (error) {
        console.error('Error creating VSAT TDMA:', error);
        req.flash('error_msg', 'Gagal menambahkan data');
        res.redirect('/akses-vsat-tdma/create');
    }
});

router.get('/:id/edit', isEditor, async (req, res) => {
    try {
        const data = await AksesVsatTdma.findByPk(req.params.id, {
            include: [{ model: Pelanggan, as: 'pelanggan' }]
        });
        if (!data) { req.flash('error_msg', 'Data tidak ditemukan'); return res.redirect('/akses-vsat-tdma'); }
        const modems = await AksesVsatTdma.findAll({ attributes: ['modem'], group: ['modem'], raw: true });
        const satelites = await AksesVsatTdma.findAll({ attributes: ['satelite'], group: ['satelite'], raw: true });

        const pelangganList = await Pelanggan.findAll({
            attributes: ['id', 'no_jaringan', 'nama_pelanggan'],
            order: [['nama_pelanggan', 'ASC']]
        });

        res.render('akses-vsat-tdma/form', {
            title: 'Edit VSAT TDMA - SIMPELL',
            data,
            modems: modems.map(m => m.modem).filter(Boolean),
            satelites: satelites.map(s => s.satelite).filter(Boolean),
            pelangganList,
            returnUrl: req.query.return_url
        });
    } catch (error) { res.redirect('/akses-vsat-tdma'); }
});

router.put('/:id', isEditor, async (req, res) => {
    try {
        await AksesVsatTdma.update(req.body, { where: { id: req.params.id } });
        req.flash('success_msg', 'Data berhasil diperbarui');
        if (req.query.return_url) {
            return res.redirect(req.query.return_url);
        }
        res.redirect('/akses-vsat-tdma');
    }
    catch (error) {
        console.error('Error updating VSAT TDMA:', error);


        router.get('/:id', async (req, res) => {
            try {
                const data = await AksesVsatTdma.findByPk(req.params.id, {
                    include: [{ model: Pelanggan, as: 'pelanggan' }]
                });
                if (!data) { req.flash('error_msg', 'Data tidak ditemukan'); return res.redirect('/akses-vsat-tdma'); }

                const modems = await AksesVsatTdma.findAll({ attributes: ['modem'], group: ['modem'], raw: true });
                const satelites = await AksesVsatTdma.findAll({ attributes: ['satelite'], group: ['satelite'], raw: true });
                const pelangganList = await Pelanggan.findAll({
                    attributes: ['id', 'no_jaringan', 'nama_pelanggan'],
                    order: [['nama_pelanggan', 'ASC']]
                });

                res.render('akses-vsat-tdma/detail', {
                    title: 'Detail VSAT TDMA - SIMPELL',
                    data,
                    modems: modems.map(m => m.modem).filter(Boolean),
                    satelites: satelites.map(s => s.satelite).filter(Boolean),
                    pelangganList,
                    readonly: true
                });
            } catch (error) { res.redirect('/akses-vsat-tdma'); }
        });
        res.redirect(`/akses-vsat-tdma/${req.params.id}/edit`);
    }
});

router.delete('/:id', isEditor, async (req, res) => {
    try {
        await AksesVsatTdma.destroy({ where: { id: req.params.id } });
        req.flash('success_msg', 'Data berhasil dihapus');
        if (req.query.return_url) {
            return res.redirect(req.query.return_url);
        }
    }
    catch (error) { req.flash('error_msg', 'Gagal menghapus'); }
    res.redirect('/akses-vsat-tdma');
});

module.exports = router;
