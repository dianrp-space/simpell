const express = require('express');
const router = express.Router();
const { DataHh } = require('../models');
const { Op } = require('sequelize');
const { isEditor } = require('../middleware/auth');

const ExcelJS = require('exceljs');
const { paginate } = require('../utils/paginate');
const moment = require('moment');

// GET - Export Excel
router.get('/export', async (req, res) => {
    try {
        const { search } = req.query;
        let where = search ? { nama_hh: { [Op.like]: `%${search}%` } } : {};

        const data = await DataHh.findAll({
            where,
            order: [['nama_hh', 'ASC']]
        });

        const workbook = new ExcelJS.Workbook();
        const sheet = workbook.addWorksheet('Data Handhole');

        // Header
        const headerRow = sheet.addRow([
            'No', 'Nama HH', 'Koordinat', 'Datek Core', 'P.J', 'Tanggal'
        ]);

        sheet.columns = [
            { key: 'no', width: 5 },
            { key: 'nama_hh', width: 25 },
            { key: 'koordinat', width: 25 },
            { key: 'datek', width: 40 },
            { key: 'pj', width: 20 },
            { key: 'tanggal', width: 15 }
        ];

        headerRow.values = [
            'No', 'Nama HH', 'Koordinat', 'Datek Core', 'P.J', 'Tanggal'
        ];

        headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
        headerRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF166534' } }; // Green 700

        // Data Rows
        data.forEach((item, idx) => {
            const koordinat = (item.latitude && item.longitude) ? `${item.latitude}, ${item.longitude}` : '-';
            // Clean datek core form formatting (br tags etc if any, usually internal newlines)
            const datek = item.datek_core ? item.datek_core.replace(/<br>/g, '\n') : '-';

            const row = sheet.addRow({
                no: idx + 1,
                nama_hh: item.nama_hh || '-',
                koordinat: koordinat,
                datek: datek,
                pj: item.pj || '-',
                tanggal: item.tanggal ? moment(item.tanggal).format('YYYY-MM-DD') : '-'
            });

            // Alignment top-left for all cells
            row.alignment = { vertical: 'top', horizontal: 'left', wrapText: true };

            if ((idx + 1) % 2 === 0) {
                row.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF0FDF4' } }; // Light Green 50
            }
        });

        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', 'attachment; filename=Data_HH_' + new Date().toISOString().slice(0, 10) + '.xlsx');

        await workbook.xlsx.write(res);
        res.end();

    } catch (error) {
        console.error('Export Error:', error);
        req.flash('error_msg', 'Gagal export data');
        res.redirect('/data-hh');
    }
});

router.get('/', async (req, res) => {
    try {
        const { search } = req.query;
        let where = search ? { nama_hh: { [Op.like]: `%${search}%` } } : {};
        const { rows, pagination } = await paginate(DataHh, req, { where, order: [['created_at', 'DESC']] });
        res.render('data-hh/index', { title: 'Data HH - SIMPELL', data: rows, pagination, search: search || '' });
    } catch (error) { req.flash('error_msg', 'Gagal memuat data'); res.redirect('/'); }
});

router.get('/create', isEditor, (req, res) => res.render('data-hh/form', { title: 'Tambah Data HH - SIMPELL', data: null }));

router.post('/', isEditor, async (req, res) => {
    try { await DataHh.create(req.body); req.flash('success_msg', 'Data berhasil ditambahkan'); res.redirect('/data-hh'); }
    catch (error) { req.flash('error_msg', 'Gagal menambahkan data'); res.redirect('/data-hh/create'); }
});

router.get('/:id/edit', isEditor, async (req, res) => {
    try {
        const data = await DataHh.findByPk(req.params.id);
        if (!data) { req.flash('error_msg', 'Data tidak ditemukan'); return res.redirect('/data-hh'); }
        res.render('data-hh/form', { title: 'Edit Data HH - SIMPELL', data });
    } catch (error) { res.redirect('/data-hh'); }
});

router.put('/:id', isEditor, async (req, res) => {
    try { await DataHh.update(req.body, { where: { id: req.params.id } }); req.flash('success_msg', 'Data berhasil diperbarui'); res.redirect('/data-hh'); }
    catch (error) { res.redirect(`/data-hh/${req.params.id}/edit`); }
});

router.delete('/:id', isEditor, async (req, res) => {
    try { await DataHh.destroy({ where: { id: req.params.id } }); req.flash('success_msg', 'Data berhasil dihapus'); }
    catch (error) { req.flash('error_msg', 'Gagal menghapus'); }
    res.redirect('/data-hh');
});

module.exports = router;
