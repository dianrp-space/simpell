const express = require('express');
const router = express.Router();
const { AksesVsatStarlink, Pelanggan } = require('../models');
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

        const data = await AksesVsatStarlink.findAll({
            where,
            include: [{ model: Pelanggan, as: 'pelanggan' }],
            order: [['created_at', 'DESC']]
        });

        const workbook = new ExcelJS.Workbook();
        const sheet = workbook.addWorksheet('Data VSAT Starlink');

        // Table Header
        sheet.getRow(1).values = [
            'No', 'No Jaringan', 'Customer', 'Type', 'SN Kit', 'SN Mikrotik',
            'No Reg PSU', 'No Reg KIT', 'Web PRTG', 'Paket', 'IP Address', 'Keterangan'
        ];

        sheet.columns = [
            { key: 'no', width: 5 },
            { key: 'no_jaringan', width: 20 },
            { key: 'customer', width: 30 },
            { key: 'type', width: 15 },
            { key: 'sn_kit', width: 20 },
            { key: 'sn_mikrotik', width: 20 },
            { key: 'no_reg_psu', width: 20 },
            { key: 'no_reg_kit', width: 20 },
            { key: 'web_prtg', width: 25 },
            { key: 'paket', width: 15 },
            { key: 'ip_address', width: 20 },
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
                type: item.starlink_type || '',
                sn_kit: item.sn_kit || '',
                sn_mikrotik: item.sn_mikrotik || '',
                no_reg_psu: item.no_registrasi_psu || '',
                no_reg_kit: item.no_registrasi_kit || '',
                web_prtg: item.web_prtg || '',
                paket: item.paket || '',
                ip_address: item.ip_address || '',
                keterangan: item.keterangan || ''
            });

            // Alternating Row Color
            if ((index + 1) % 2 === 0) {
                row.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF9FAFB' } };
            }
        });

        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', 'attachment; filename=VSAT_Starlink_Full_' + new Date().toISOString().slice(0, 10) + '.xlsx');

        await workbook.xlsx.write(res);
        res.end();

    } catch (error) {
        console.error('Export Error:', error);
        req.flash('error_msg', 'Gagal export data');
        res.redirect('/akses-vsat-starlink');
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
        const { rows, pagination } = await paginate(AksesVsatStarlink, req, {
            where,
            include: [{ model: Pelanggan, as: 'pelanggan' }],
            order: [['created_at', 'DESC']],
            subQuery: false
        });
        res.render('akses-vsat-starlink/index', { title: 'VSAT Starlink - SIMPELL', data: rows, pagination, search: search || '' });
    } catch (error) {
        req.flash('error_msg', 'Gagal memuat data');
        res.redirect('/');
    }
});

router.get('/create', isEditor, async (req, res) => {
    const types = await AksesVsatStarlink.findAll({ attributes: ['starlink_type'], group: ['starlink_type'], raw: true });
    const pelangganList = await Pelanggan.findAll({
        attributes: ['id', 'no_jaringan', 'nama_pelanggan'],
        order: [['nama_pelanggan', 'ASC']]
    });

    res.render('akses-vsat-starlink/form', {
        title: 'Tambah VSAT Starlink - SIMPELL',
        data: null,
        starlinkTypes: types.map(t => t.starlink_type).filter(Boolean),
        pelangganList
    });
});

router.post('/', isEditor, async (req, res) => {
    try {
        const payload = req.body;
        // pelanggan_id is expected to be in req.body from the form select

        if (payload.pelanggan_id === '') payload.pelanggan_id = null;

        await AksesVsatStarlink.create(payload);
        req.flash('success_msg', 'Data berhasil ditambahkan');
        res.redirect('/akses-vsat-starlink');
    } catch (error) {
        req.flash('error_msg', 'Gagal menambahkan data');
        res.redirect('/akses-vsat-starlink/create');
    }
});

router.get('/:id/edit', isEditor, async (req, res) => {
    try {
        const data = await AksesVsatStarlink.findByPk(req.params.id, {
            include: [{ model: Pelanggan, as: 'pelanggan' }]
        });
        const types = await AksesVsatStarlink.findAll({ attributes: ['starlink_type'], group: ['starlink_type'], raw: true });

        if (!data) { req.flash('error_msg', 'Data tidak ditemukan'); return res.redirect('/akses-vsat-starlink'); }

        const pelangganList = await Pelanggan.findAll({
            attributes: ['id', 'no_jaringan', 'nama_pelanggan'],
            order: [['nama_pelanggan', 'ASC']]
        });

        res.render('akses-vsat-starlink/form', {
            title: 'Edit VSAT Starlink - SIMPELL',
            data,
            starlinkTypes: types.map(t => t.starlink_type).filter(Boolean),
            pelangganList,
            returnUrl: req.query.return_url
        });
    } catch (error) { res.redirect('/akses-vsat-starlink'); }
});

router.put('/:id', isEditor, async (req, res) => {
    try {
        if (req.body.pelanggan_id === '') req.body.pelanggan_id = null;

        await AksesVsatStarlink.update(req.body, { where: { id: req.params.id } });
        req.flash('success_msg', 'Data berhasil diperbarui');
        if (req.query.return_url) {
            return res.redirect(req.query.return_url);
        }
        res.redirect('/akses-vsat-starlink');
    } catch (error) { res.redirect(`/akses-vsat-starlink/${req.params.id}/edit`); }

});

router.get('/:id', async (req, res) => {
    try {
        const data = await AksesVsatStarlink.findByPk(req.params.id, {
            include: [{ model: Pelanggan, as: 'pelanggan' }]
        });
        if (!data) { req.flash('error_msg', 'Data tidak ditemukan'); return res.redirect('/akses-vsat-starlink'); }

        const types = await AksesVsatStarlink.findAll({ attributes: ['starlink_type'], group: ['starlink_type'], raw: true });
        const pelangganList = await Pelanggan.findAll({
            attributes: ['id', 'no_jaringan', 'nama_pelanggan'],
            order: [['nama_pelanggan', 'ASC']]
        });

        res.render('akses-vsat-starlink/detail', {
            title: 'Detail VSAT Starlink - SIMPELL',
            data,
            starlinkTypes: types.map(t => t.starlink_type).filter(Boolean),
            pelangganList,
            readonly: true
        });
    } catch (error) { res.redirect('/akses-vsat-starlink'); }
});

router.delete('/:id', isEditor, async (req, res) => {
    try {
        await AksesVsatStarlink.destroy({ where: { id: req.params.id } });
        req.flash('success_msg', 'Data berhasil dihapus');
        if (req.query.return_url) {
            return res.redirect(req.query.return_url);
        }
    } catch (error) { req.flash('error_msg', 'Gagal menghapus'); }
    res.redirect('/akses-vsat-starlink');
});

module.exports = router;
