const express = require('express');
const router = express.Router();
const { AsetFo } = require('../models');
const { Op } = require('sequelize');
const { isEditor } = require('../middleware/auth');

const ExcelJS = require('exceljs');
const { paginate } = require('../utils/paginate');

// GET - Export Excel
router.get('/export', async (req, res) => {
    try {
        const { search } = req.query;
        let where = search ? { [Op.or]: [{ nama_node: { [Op.like]: `%${search}%` } }, { kota: { [Op.like]: `%${search}%` } }] } : {};

        const data = await AsetFo.findAll({
            where,
            order: [['nama_node', 'ASC']]
        });

        const workbook = new ExcelJS.Workbook();
        const sheet = workbook.addWorksheet('Data Aset FO');

        // Header
        const headerRow = sheet.addRow([
            'No', 'Nama Node', 'Kota', 'Node', 'Splitter ODP',
            'Jml SI ONT', 'Jml SI P2P', 'Jml HH',
            'P. Backbone (m)', 'P. Lastmile (m)', 'Jml Tiang'
        ]);

        sheet.columns = [
            { key: 'no', width: 5 },
            { key: 'nama_node', width: 25 },
            { key: 'kota', width: 20 },
            { key: 'node', width: 15 },
            { key: 'splitter', width: 15 },
            { key: 'si_ont', width: 15 },
            { key: 'si_p2p', width: 15 },
            { key: 'hh', width: 10 },
            { key: 'p_backbone', width: 15 },
            { key: 'p_lastmile', width: 15 },
            { key: 'jml_tiang', width: 10 }
        ];

        headerRow.values = [
            'No', 'Nama Node', 'Kota', 'Node', 'Splitter ODP',
            'Jml SI ONT', 'Jml SI P2P', 'Jml HH',
            'P. Backbone (m)', 'P. Lastmile (m)', 'Jml Tiang'
        ];

        headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
        headerRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF166534' } }; // Green 700

        // Data Rows
        data.forEach((item, idx) => {
            const row = sheet.addRow({
                no: idx + 1,
                nama_node: item.nama_node || '-',
                kota: item.kota || '-',
                node: item.node || '-',
                splitter: item.splitter_odp || '-',
                si_ont: item.jumlah_si_ont || 0,
                si_p2p: item.jumlah_si_p2p || 0,
                hh: item.jumlah_hh || 0,
                p_backbone: item.panjang_backbone || 0,
                p_lastmile: item.panjang_lastmile || 0,
                jml_tiang: item.jumlah_tiang || 0
            });

            if ((idx + 1) % 2 === 0) {
                row.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF0FDF4' } }; // Light Green 50
            }
        });

        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', 'attachment; filename=Aset_FO_' + new Date().toISOString().slice(0, 10) + '.xlsx');

        await workbook.xlsx.write(res);
        res.end();

    } catch (error) {
        console.error('Export Error:', error);
        req.flash('error_msg', 'Gagal export data');
        res.redirect('/aset-fo');
    }
});

router.get('/', async (req, res) => {
    try {
        const { search } = req.query;
        let where = search ? { [Op.or]: [{ nama_node: { [Op.like]: `%${search}%` } }, { kota: { [Op.like]: `%${search}%` } }] } : {};
        const { rows, pagination } = await paginate(AsetFo, req, { where, order: [['created_at', 'DESC']] });
        res.render('aset-fo/index', { title: 'Aset FO - SIMPELL', data: rows, pagination, search: search || '' });
    } catch (error) { req.flash('error_msg', 'Gagal memuat data'); res.redirect('/'); }
});

router.get('/create', isEditor, (req, res) => res.render('aset-fo/form', { title: 'Tambah Aset FO - SIMPELL', data: null }));

router.post('/', isEditor, async (req, res) => {
    try { await AsetFo.create(req.body); req.flash('success_msg', 'Data berhasil ditambahkan'); res.redirect('/aset-fo'); }
    catch (error) { req.flash('error_msg', 'Gagal menambahkan data'); res.redirect('/aset-fo/create'); }
});

router.get('/:id/edit', isEditor, async (req, res) => {
    try {
        const data = await AsetFo.findByPk(req.params.id);
        if (!data) { req.flash('error_msg', 'Data tidak ditemukan'); return res.redirect('/aset-fo'); }
        res.render('aset-fo/form', { title: 'Edit Aset FO - SIMPELL', data });
    } catch (error) { res.redirect('/aset-fo'); }
});

router.put('/:id', isEditor, async (req, res) => {
    try { await AsetFo.update(req.body, { where: { id: req.params.id } }); req.flash('success_msg', 'Data berhasil diperbarui'); res.redirect('/aset-fo'); }
    catch (error) { res.redirect(`/aset-fo/${req.params.id}/edit`); }
});

router.delete('/:id', isEditor, async (req, res) => {
    try { await AsetFo.destroy({ where: { id: req.params.id } }); req.flash('success_msg', 'Data berhasil dihapus'); }
    catch (error) { req.flash('error_msg', 'Gagal menghapus'); }
    res.redirect('/aset-fo');
});

module.exports = router;
