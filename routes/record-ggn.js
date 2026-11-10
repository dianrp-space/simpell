const express = require('express');
const router = express.Router();
const { RecordGgn, Pelanggan } = require('../models');
const { Op } = require('sequelize');
const { isEditor } = require('../middleware/auth');

const ExcelJS = require('exceljs');
const { paginate } = require('../utils/paginate');
const moment = require('moment');

const STATUSES = ['Pending', 'Progress', 'Done', 'Cancelled'];
const AKSES_TYPES = ['FO', 'VSAT Starlink', 'M2M', 'SOLTEM', 'VSAT TDMA', 'SCPC'];

router.get('/export', async (req, res) => {
    try {
        const { search, status } = req.query;
        const where = {};
        if (status && STATUSES.includes(status)) where.status = status;
        if (search) {
            where[Op.or] = [
                { no_ticket: { [Op.like]: `%${search}%` } },
                { '$pelanggan.nama_pelanggan$': { [Op.like]: `%${search}%` } },
                { '$pelanggan.no_jaringan$': { [Op.like]: `%${search}%` } }
            ];
        }

        const data = await RecordGgn.findAll({
            where,
            order: [['tanggal', 'DESC']],
            include: [{ model: Pelanggan, as: 'pelanggan' }]
        });

        const workbook = new ExcelJS.Workbook();
        const sheet = workbook.addWorksheet('Record GGN');

        sheet.columns = [
            { header: 'Tanggal', key: 'tanggal', width: 15 },
            { header: 'Case', key: 'case_type', width: 15 },
            { header: 'No Ticket', key: 'no_ticket', width: 20 },
            { header: 'No Jaringan', key: 'no_jaringan', width: 20 },
            { header: 'Customer', key: 'customer', width: 30 },
            { header: 'History & Kontak PIC', key: 'history_kontak_pic', width: 40 },
            { header: 'RFO', key: 'rfo', width: 40 },
            { header: 'Akses', key: 'akses', width: 15 },
            { header: 'PJ', key: 'pj', width: 20 },
            { header: 'Durasi Progres', key: 'durasi_progress', width: 20 },
            { header: 'Status', key: 'status', width: 15 }
        ];

        // Header style
        sheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
        sheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF10B981' } }; // Green for Record

        data.forEach(item => {
            sheet.addRow({
                tanggal: item.tanggal ? new Date(item.tanggal).toLocaleDateString('id-ID') : '-',
                case_type: item.case_type || '-',
                no_ticket: item.no_ticket || '-',
                no_jaringan: item.pelanggan ? item.pelanggan.no_jaringan : '-',
                customer: item.pelanggan ? item.pelanggan.nama_pelanggan : '-',
                history_kontak_pic: item.history_kontak_pic || '-',
                rfo: item.rfo || '-',
                akses: item.akses || '-',
                pj: item.pj || '-',
                durasi_progress: item.durasi_progress || '-',
                status: item.status || '-'
            });
        });

        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', 'attachment; filename=Record_GGN_' + new Date().toISOString().slice(0, 10) + '.xlsx');

        await workbook.xlsx.write(res);
        res.end();

    } catch (error) {
        console.error('Export Error:', error);
        req.flash('error_msg', 'Gagal export data');
        res.redirect('/record-ggn');
    }
});

router.get('/', async (req, res) => {
    try {
        const { search, status } = req.query;
        const where = {};
        if (status && STATUSES.includes(status)) where.status = status;
        if (search) {
            where[Op.or] = [
                { no_ticket: { [Op.like]: `%${search}%` } },
                { '$pelanggan.nama_pelanggan$': { [Op.like]: `%${search}%` } },
                { '$pelanggan.no_jaringan$': { [Op.like]: `%${search}%` } }
            ];
        }
        const { rows, pagination } = await paginate(RecordGgn, req, {
            where,
            order: [['tanggal', 'DESC']],
            include: [{ model: Pelanggan, as: 'pelanggan' }],
            subQuery: false
        });
        res.render('record-ggn/index', {
            title: 'Record GGN & PM - SIMPELL',
            data: rows,
            pagination,
            search: search || '',
            status: status || '',
            statuses: STATUSES
        });
    } catch (error) { req.flash('error_msg', 'Gagal memuat data'); res.redirect('/'); }
});

router.get('/create', isEditor, async (req, res) => {
    const cases = await RecordGgn.findAll({ attributes: ['case_type'], group: ['case_type'], raw: true });
    const pelangganList = await Pelanggan.findAll({
        attributes: ['id', 'no_jaringan', 'nama_pelanggan'],
        order: [['nama_pelanggan', 'ASC']]
    });

    res.render('record-ggn/form', {
        title: 'Tambah Record GGN - SIMPELL',
        data: null,
        caseTypes: cases.map(c => c.case_type).filter(Boolean),
        pelangganList
    });
});

router.post('/', isEditor, async (req, res) => {
    try {
        const payload = {
            ...req.body,
            pelanggan_id: req.body.pelanggan_id || null
        };

        if (payload.pelanggan_id === '') payload.pelanggan_id = null;

        await RecordGgn.create(payload);
        req.flash('success_msg', 'Data berhasil ditambahkan');
        res.redirect('/record-ggn');
    }
    catch (error) { req.flash('error_msg', 'Gagal menambahkan data'); res.redirect('/record-ggn/create'); }
});

router.get('/:id/edit', isEditor, async (req, res) => {
    try {
        const data = await RecordGgn.findByPk(req.params.id, {
            include: [{ model: Pelanggan, as: 'pelanggan' }]
        });
        if (!data) { req.flash('error_msg', 'Data tidak ditemukan'); return res.redirect('/record-ggn'); }

        const cases = await RecordGgn.findAll({ attributes: ['case_type'], group: ['case_type'], raw: true });
        const pelangganList = await Pelanggan.findAll({
            attributes: ['id', 'no_jaringan', 'nama_pelanggan'],
            order: [['nama_pelanggan', 'ASC']]
        });

        res.render('record-ggn/form', {
            title: 'Edit Record GGN - SIMPELL',
            data,
            caseTypes: cases.map(c => c.case_type).filter(Boolean),
            pelangganList,
            returnUrl: req.query.return_url
        });

    } catch (error) { res.redirect('/record-ggn'); }
});

router.get('/:id', async (req, res) => {
    try {
        const data = await RecordGgn.findByPk(req.params.id, {
            include: [{ model: Pelanggan, as: 'pelanggan' }]
        });
        if (!data) { req.flash('error_msg', 'Data tidak ditemukan'); return res.redirect('/record-ggn'); }

        const cases = await RecordGgn.findAll({ attributes: ['case_type'], group: ['case_type'], raw: true });
        const dbAkses = await RecordGgn.findAll({ attributes: ['akses'], group: ['akses'], raw: true });
        const allAkses = [...new Set([...AKSES_TYPES, ...dbAkses.map(a => a.akses).filter(Boolean)])].sort();
        const pelangganList = await Pelanggan.findAll({
            attributes: ['id', 'no_jaringan', 'nama_pelanggan'],
            order: [['nama_pelanggan', 'ASC']]
        });

        res.render('record-ggn/detail', {
            title: 'Detail Record GGN - SIMPELL',
            data,
            caseTypes: cases.map(c => c.case_type).filter(Boolean),
            statuses: STATUSES,
            aksesTypes: allAkses,
            pelangganList,
            readonly: true
        });
    } catch (error) { res.redirect('/record-ggn'); }
});

router.put('/:id', isEditor, async (req, res) => {
    try {
        const payload = {
            ...req.body,
            pelanggan_id: req.body.pelanggan_id || null
        };

        if (payload.pelanggan_id === '') payload.pelanggan_id = null;

        await RecordGgn.update(payload, { where: { id: req.params.id } });
        req.flash('success_msg', 'Data berhasil diperbarui');
        if (req.query.return_url) {
            return res.redirect(req.query.return_url);
        }
        res.redirect('/record-ggn');
    }
    catch (error) { res.redirect(`/record-ggn/${req.params.id}/edit`); }
});

router.delete('/:id', isEditor, async (req, res) => {
    try {
        await RecordGgn.destroy({ where: { id: req.params.id } });
        req.flash('success_msg', 'Data berhasil dihapus');
        if (req.query.return_url) {
            return res.redirect(req.query.return_url);
        }
    }
    catch (error) { req.flash('error_msg', 'Gagal menghapus'); }
    res.redirect('/record-ggn');
});

module.exports = router;
