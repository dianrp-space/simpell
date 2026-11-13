const express = require('express');
const router = express.Router();
const { DataClosure } = require('../models');
const { Op } = require('sequelize');
const { isEditor } = require('../middleware/auth');

const ExcelJS = require('exceljs');
const { paginate } = require('../utils/paginate');
const moment = require('moment');

// GET - Export Excel
router.get('/export', async (req, res) => {
    try {
        const { search } = req.query;
        let where = search ? { nama_closure: { [Op.like]: `%${search}%` } } : {};

        const data = await DataClosure.findAll({
            where,
            order: [['nama_closure', 'ASC']]
        });

        const workbook = new ExcelJS.Workbook();
        const sheet = workbook.addWorksheet('Data Closure');

        // Header
        const headerRow = sheet.addRow([
            'No', 'Nama Closure', 'Koordinat', 'Data Core', 'P.J', 'Tanggal'
        ]);

        sheet.columns = [
            { key: 'no', width: 5 },
            { key: 'nama_closure', width: 25 },
            { key: 'koordinat', width: 25 },
            { key: 'data_core', width: 40 },
            { key: 'pj', width: 20 },
            { key: 'tanggal', width: 15 }
        ];

        headerRow.values = [
            'No', 'Nama Closure', 'Koordinat', 'Data Core', 'P.J', 'Tanggal'
        ];

        headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
        headerRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF166534' } }; // Green 700

        // Data Rows
        data.forEach((item, idx) => {
            const koordinat = (item.latitude && item.longitude) ? `${item.latitude}, ${item.longitude}` : '-';
            // Clean data core form formatting (br tags etc if any)
            const dataCore = item.data_core ? item.data_core.replace(/<br>/g, '\n') : '-';

            const row = sheet.addRow({
                no: idx + 1,
                nama_closure: item.nama_closure || '-',
                koordinat: koordinat,
                data_core: dataCore,
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
        res.setHeader('Content-Disposition', 'attachment; filename=Data_Closure_' + new Date().toISOString().slice(0, 10) + '.xlsx');

        await workbook.xlsx.write(res);
        res.end();

    } catch (error) {
        console.error('Export Error:', error);
        req.flash('error_msg', 'Gagal export data');
        res.redirect('/data-closure');
    }
});

router.get('/', async (req, res) => {
    try {
        const { search } = req.query;
        let where = search ? { nama_closure: { [Op.like]: `%${search}%` } } : {};
        const { rows, pagination } = await paginate(DataClosure, req, { where, order: [['created_at', 'DESC']] });
        res.render('data-closure/index', { title: 'Data Closure - SIMPELL', data: rows, pagination, search: search || '' });
    } catch (error) { req.flash('error_msg', 'Gagal memuat data'); res.redirect('/'); }
});

router.get('/create', isEditor, (req, res) => res.render('data-closure/form', { title: 'Tambah Data Closure - SIMPELL', data: null }));

router.post('/', isEditor, async (req, res) => {
    try { await DataClosure.create(req.body); req.flash('success_msg', 'Data berhasil ditambahkan'); res.redirect('/data-closure'); }
    catch (error) {
        const message = error.message && error.message.startsWith('Koordinat') ? error.message : 'Gagal menambahkan data';
        req.flash('error_msg', message);
        res.redirect('/data-closure/create');
    }
});

router.get('/:id/edit', isEditor, async (req, res) => {
    try {
        const data = await DataClosure.findByPk(req.params.id);
        if (!data) { req.flash('error_msg', 'Data tidak ditemukan'); return res.redirect('/data-closure'); }
        res.render('data-closure/form', { title: 'Edit Data Closure - SIMPELL', data });
    } catch (error) { res.redirect('/data-closure'); }
});

router.put('/:id', isEditor, async (req, res) => {
    try { await DataClosure.update(req.body, { where: { id: req.params.id } }); req.flash('success_msg', 'Data berhasil diperbarui'); res.redirect('/data-closure'); }
    catch (error) {
        const message = error.message && error.message.startsWith('Koordinat') ? error.message : 'Gagal memperbarui data';
        req.flash('error_msg', message);
        res.redirect(`/data-closure/${req.params.id}/edit`);
    }
});

router.delete('/:id', isEditor, async (req, res) => {
    try { await DataClosure.destroy({ where: { id: req.params.id } }); req.flash('success_msg', 'Data berhasil dihapus'); }
    catch (error) { req.flash('error_msg', 'Gagal menghapus'); }
    res.redirect('/data-closure');
});

module.exports = router;
