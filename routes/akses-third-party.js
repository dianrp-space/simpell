const express = require('express');
const router = express.Router();
const AksesThirdParty = require('../models/AksesThirdParty');
const Pelanggan = require('../models/Pelanggan');
const { Op } = require('sequelize');
const { isEditor } = require('../middleware/auth');


const ExcelJS = require('exceljs');
const { paginate } = require('../utils/paginate');
const moment = require('moment');

// GET - Export Excel (Must be before dynamic /:id route)
router.get('/export', async (req, res) => {
    try {
        const { search } = req.query;
        let where = {};

        if (search) {
            where = {
                [Op.or]: [
                    { '$pelanggan.no_jaringan$': { [Op.like]: `%${search}%` } },
                    { nama_mitra: { [Op.like]: `%${search}%` } },
                    { '$pelanggan.nama_pelanggan$': { [Op.like]: `%${search}%` } },
                    { id_segment: { [Op.like]: `%${search}%` } },
                    { id_provider: { [Op.like]: `%${search}%` } },
                    { asal: { [Op.like]: `%${search}%` } },
                    { tujuan: { [Op.like]: `%${search}%` } }
                ]
            };
        }

        const data = await AksesThirdParty.findAll({
            where,
            include: [{ model: Pelanggan, as: 'pelanggan' }],
            order: [['updatedAt', 'DESC']]
        });

        const workbook = new ExcelJS.Workbook();
        const sheet = workbook.addWorksheet('Data 3rd Party');

        // Header
        const headerRow = sheet.addRow([
            'No', 'No Jaringan', 'Customer', 'ID Segment', 'ID Provider',
            'Nama Mitra', 'Asal', 'Tujuan', 'Bandwidth', 'Sewa/Bulan', 'Tgl Online', 'Keterangan'
        ]);

        sheet.columns = [
            { key: 'no', width: 5 },
            { key: 'no_jaringan', width: 20 },
            { key: 'customer', width: 30 },
            { key: 'id_segment', width: 20 },
            { key: 'id_provider', width: 20 },
            { key: 'nama_mitra', width: 25 },
            { key: 'asal', width: 20 },
            { key: 'tujuan', width: 20 },
            { key: 'bandwidth', width: 10 },
            { key: 'sewa', width: 15 },
            { key: 'tgl_online', width: 15 },
            { key: 'keterangan', width: 30 }
        ];

        // Re-apply values to header row to be safe
        headerRow.values = [
            'No', 'No Jaringan', 'Customer', 'ID Segment', 'ID Provider',
            'Nama Mitra', 'Asal', 'Tujuan', 'Bandwidth', 'Sewa/Bulan', 'Tgl Online', 'Keterangan'
        ];

        headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
        headerRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF166534' } }; // Green 700

        // Data Rows
        data.forEach((item, idx) => {
            const row = sheet.addRow({
                no: idx + 1,
                no_jaringan: item.pelanggan ? item.pelanggan.no_jaringan : '-',
                customer: item.pelanggan ? item.pelanggan.nama_pelanggan : '-',
                id_segment: item.id_segment || '-',
                id_provider: item.id_provider || '-',
                nama_mitra: item.nama_mitra || '-',
                asal: item.asal || '-',
                tujuan: item.tujuan || '-',
                bandwidth: item.bandwidth || '-',
                sewa: item.sewa_per_bulan || '-',
                tgl_online: item.tgl_online ? moment(item.tgl_online).format('YYYY-MM-DD') : '-',
                keterangan: item.pelanggan ? item.pelanggan.keterangan : '' // Or item specific desc? 3rd party doesn't have own keterangan in view, using pelanggan's or just empty
            });

            if ((idx + 1) % 2 === 0) {
                row.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF0FDF4' } }; // Light Green 50
            }
        });

        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', 'attachment; filename=Akses_3rdParty_' + new Date().toISOString().slice(0, 10) + '.xlsx');

        await workbook.xlsx.write(res);
        res.end();

    } catch (error) {
        console.error('Export Error:', error);
        req.flash('error_msg', 'Gagal export data');
        res.redirect('/akses-third-party');
    }
});
router.get('/', async (req, res) => {
    try {
        const { search } = req.query;
        let where = {};

        if (search) {
            where = {
                [Op.or]: [
                    { '$pelanggan.no_jaringan$': { [Op.like]: `%${search}%` } },
                    { nama_mitra: { [Op.like]: `%${search}%` } },
                    { '$pelanggan.nama_pelanggan$': { [Op.like]: `%${search}%` } }
                ]
            };
        }

        const { rows, pagination } = await paginate(AksesThirdParty, req, {
            where,
            include: [{ model: Pelanggan, as: 'pelanggan' }],
            order: [['updatedAt', 'DESC']],
            subQuery: false
        });
        res.render('akses-third-party/index', {
            title: 'Akses 3rd Party - SIMPELL',
            data: rows.map(d => d.toJSON()),
            pagination,
            currentPath: req.baseUrl,
            search
        });
    } catch (error) {
        console.error(error);
        res.redirect('/');
    }
});

// GET /create - Show form
router.get('/create', isEditor, async (req, res) => {
    try {
        const pelangganList = await Pelanggan.findAll({
            attributes: ['id', 'nama_pelanggan', 'no_jaringan'],
            where: { status: 'Active' },
            order: [['nama_pelanggan', 'ASC']]
        });

        res.render('akses-third-party/form', {
            title: 'Tambah Akses 3rd Party',
            data: null,
            pelangganList: pelangganList.map(p => p.toJSON()),
            pelangganList: pelangganList.map(p => p.toJSON())
        });
    } catch (error) {
        console.error(error);
        res.redirect('/akses-third-party');
    }
});

// POST / - Store new data
router.post('/', isEditor, async (req, res) => {
    try {
        await AksesThirdParty.create(req.body);
        req.flash('success_msg', 'Data 3rd Party berhasil ditambahkan');
        res.redirect('/akses-third-party');
    } catch (error) {
        console.error(error);
        req.flash('error_msg', 'Gagal menambah data');
        res.redirect('/akses-third-party/create');
    }
});

// GET /:id/edit - Show edit form
router.get('/:id/edit', isEditor, async (req, res) => {
    try {
        const data = await AksesThirdParty.findByPk(req.params.id, {
            include: [{ model: Pelanggan, as: 'pelanggan' }]
        });

        if (!data) return res.redirect('/akses-third-party');

        const pelangganList = await Pelanggan.findAll({
            attributes: ['id', 'nama_pelanggan', 'no_jaringan'],
            where: { status: 'Active' },
            order: [['nama_pelanggan', 'ASC']]
        });

        res.render('akses-third-party/form', {
            title: 'Edit Akses 3rd Party',
            data: data.toJSON(),
            pelangganList: pelangganList.map(p => p.toJSON()),
            pelangganList: pelangganList.map(p => p.toJSON()),
            returnUrl: req.query.return_url
        });
    } catch (error) {
        console.error(error);
        res.redirect('/akses-third-party');
    }

});

router.get('/:id', async (req, res) => {
    try {
        const data = await AksesThirdParty.findByPk(req.params.id, {
            include: [{ model: Pelanggan, as: 'pelanggan' }]
        });
        if (!data) return res.redirect('/akses-third-party');

        const pelangganList = await Pelanggan.findAll({
            attributes: ['id', 'nama_pelanggan', 'no_jaringan'],
            where: { status: 'Active' },
            order: [['nama_pelanggan', 'ASC']]
        });

        res.render('akses-third-party/detail', {
            title: 'Detail Akses 3rd Party',
            data: data.toJSON(),
            pelangganList: pelangganList.map(p => p.toJSON()),
            readonly: true
        });
    } catch (error) {
        console.error(error);
        res.redirect('/akses-third-party');
    }
});

// PUT /:id - Update data
router.put('/:id', isEditor, async (req, res) => {
    try {
        await AksesThirdParty.update(req.body, { where: { id: req.params.id } });
        req.flash('success_msg', 'Data berhasil diperbarui');
        if (req.query.return_url) {
            return res.redirect(req.query.return_url);
        }
        res.redirect('/akses-third-party');
    } catch (error) {
        console.error(error);
        req.flash('error_msg', 'Gagal memperbarui data');
        res.redirect(`/akses-third-party/${req.params.id}/edit`);
    }
});

// DELETE /:id - Delete data
router.delete('/:id', isEditor, async (req, res) => {
    try {
        await AksesThirdParty.destroy({ where: { id: req.params.id } });
        req.flash('success_msg', 'Data berhasil dihapus');
        if (req.query.return_url) {
            return res.redirect(req.query.return_url);
        }
        res.redirect('/akses-third-party');
    } catch (error) {
        console.error(error);
        req.flash('error_msg', 'Gagal menghapus data');
        res.redirect('/akses-third-party');
    }
});

// GET /:id - Detail data
router.get('/:id', async (req, res) => {
    try {
        const data = await AksesThirdParty.findByPk(req.params.id, {
            include: [{ model: Pelanggan, as: 'pelanggan' }]
        });

        if (!data) return res.redirect('/akses-third-party');

        res.render('akses-third-party/detail', {
            title: 'Detail Akses 3rd Party',
            data: data.toJSON(),
            readonly: true
        });
    } catch (error) {
        console.error(error);
        res.redirect('/akses-third-party');
    }
});

module.exports = router;
