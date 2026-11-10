const express = require('express');
const router = express.Router();
const { Patroli } = require('../models');
const { Op } = require('sequelize');
const { isEditor } = require('../middleware/auth');
const ExcelJS = require('exceljs');
const moment = require('moment');
const { paginate } = require('../utils/paginate');

// Export to Excel
router.get('/export', async (req, res) => {
    try {
        const { search } = req.query;
        let where = {};
        if (search) {
            where[Op.or] = [
                { lokasi: { [Op.like]: `%${search}%` } },
                { pj: { [Op.like]: `%${search}%` } },
                { keterangan: { [Op.like]: `%${search}%` } },
                { rincian: { [Op.like]: `%${search}%` } }
            ];
        }

        const data = await Patroli.findAll({
            where,
            order: [['tanggal', 'DESC'], ['waktu_mulai', 'ASC']]
        });

        const workbook = new ExcelJS.Workbook();
        const sheet = workbook.addWorksheet('Patroli');

        sheet.columns = [
            { header: 'Tanggal', key: 'tanggal', width: 15 },
            { header: 'Waktu Mulai', key: 'waktu_mulai', width: 15 },
            { header: 'Waktu Selesai', key: 'waktu_selesai', width: 15 },
            { header: 'Lokasi Patroli', key: 'lokasi', width: 30 },
            { header: 'Rincian', key: 'rincian', width: 40 },
            { header: 'PJ', key: 'pj', width: 20 },
            { header: 'Keterangan', key: 'keterangan', width: 40 }
        ];

        // Header style
        sheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
        sheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF10B981' } };

        data.forEach(item => {
            sheet.addRow({
                tanggal: item.tanggal ? moment(item.tanggal).format('DD/MM/YYYY') : '-',
                waktu_mulai: item.waktu_mulai || '-',
                waktu_selesai: item.waktu_selesai || '-',
                lokasi: item.lokasi || '-',
                rincian: item.rincian || '-',
                pj: item.pj || '-',
                keterangan: item.keterangan || '-'
            });
        });

        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', 'attachment; filename=Patroli_' + new Date().toISOString().slice(0, 10) + '.xlsx');

        await workbook.xlsx.write(res);
        res.end();

    } catch (error) {
        console.error('Export Error:', error);
        req.flash('error_msg', 'Gagal export data');
        res.redirect('/patroli');
    }
});

// Index
router.get('/', async (req, res) => {
    try {
        const { search } = req.query;
        let where = {};
        if (search) {
            where[Op.or] = [
                { lokasi: { [Op.like]: `%${search}%` } },
                { pj: { [Op.like]: `%${search}%` } },
                { keterangan: { [Op.like]: `%${search}%` } },
                { rincian: { [Op.like]: `%${search}%` } }
            ];
        }

        const { rows, pagination } = await paginate(Patroli, req, {
            where,
            order: [['tanggal', 'DESC'], ['waktu_mulai', 'ASC']]
        });

        res.render('patroli/index', {
            title: 'Patroli - SIMPELL',
            data: rows,
            pagination,
            search: search || '',
            moment
        });
    } catch (error) {
        console.error(error);
        req.flash('error_msg', 'Gagal memuat data');
        res.redirect('/');
    }
});

// Form Create
router.get('/create', isEditor, async (req, res) => {
    res.render('patroli/form', {
        title: 'Tambah Patroli - SIMPELL',
        data: null,
        moment
    });
});

// Store
router.post('/', isEditor, async (req, res) => {
    try {
        await Patroli.create(req.body);
        req.flash('success_msg', 'Data patroli berhasil ditambahkan');
        res.redirect('/patroli');
    } catch (error) {
        console.error(error);
        req.flash('error_msg', 'Gagal menambahkan data');
        res.redirect('/patroli/create');
    }
});

// Form Edit
router.get('/:id/edit', isEditor, async (req, res) => {
    try {
        const data = await Patroli.findByPk(req.params.id);
        if (!data) {
            req.flash('error_msg', 'Data tidak ditemukan');
            return res.redirect('/patroli');
        }
        res.render('patroli/form', {
            title: 'Edit Patroli - SIMPELL',
            data,
            moment,
            returnUrl: req.query.return_url
        });
    } catch (error) {
        req.flash('error_msg', 'Terjadi kesalahan');
        res.redirect('/patroli');
    }
});

// Update
router.put('/:id', isEditor, async (req, res) => {
    try {
        await Patroli.update(req.body, { where: { id: req.params.id } });
        req.flash('success_msg', 'Data patroli berhasil diperbarui');
        if (req.query.return_url) {
            return res.redirect(req.query.return_url);
        }
        res.redirect('/patroli');
    } catch (error) {
        console.error(error);
        req.flash('error_msg', 'Gagal memperbarui data');
        res.redirect(`/patroli/${req.params.id}/edit`);
    }
});

// Delete
router.delete('/:id', isEditor, async (req, res) => {
    try {
        await Patroli.destroy({ where: { id: req.params.id } });
        req.flash('success_msg', 'Data patroli berhasil dihapus');
        if (req.query.return_url) {
            return res.redirect(req.query.return_url);
        }
        res.redirect('/patroli');
    } catch (error) {
        req.flash('error_msg', 'Gagal menghapus data');
        res.redirect('/patroli');
    }
});

module.exports = router;
