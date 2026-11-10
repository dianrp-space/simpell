const express = require('express');
const router = express.Router();
const { PendingGgn, Pelanggan } = require('../models');
const { Op } = require('sequelize');
const { isEditor } = require('../middleware/auth');

const STATUSES = ['Pending', 'Progress', 'Done', 'Cancelled'];
const AKSES_TYPES = ['FO', 'VSAT Starlink', 'M2M', 'VSAT TDMA', 'SCPC'];

const ExcelJS = require('exceljs');
const moment = require('moment'); // Ensure moment is available or use native Date
const { paginate } = require('../utils/paginate');

router.get('/export', async (req, res) => {
    try {
        const { search, status } = req.query;
        let where = {};
        if (search) {
            where[Op.or] = [
                { no_ticket: { [Op.like]: `%${search}%` } },
                { '$pelanggan.nama_pelanggan$': { [Op.like]: `%${search}%` } },
                { '$pelanggan.no_jaringan$': { [Op.like]: `%${search}%` } }
            ];
        }
        if (status) { where.status = status; }

        const data = await PendingGgn.findAll({
            where,
            order: [['tanggal', 'DESC']],
            include: [{ model: Pelanggan, as: 'pelanggan' }]
        });

        const workbook = new ExcelJS.Workbook();
        const sheet = workbook.addWorksheet('Pending GGN');

        sheet.columns = [
            { header: 'Tanggal', key: 'tanggal', width: 15 },
            { header: 'No Ticket', key: 'no_ticket', width: 20 },
            { header: 'No Jaringan', key: 'no_jaringan', width: 20 },
            { header: 'Customer', key: 'customer', width: 30 },
            { header: 'Akses', key: 'akses', width: 15 },
            { header: 'Rincian', key: 'rincian', width: 40 },
            { header: 'Status', key: 'status', width: 15 },
            { header: 'Keterangan', key: 'keterangan', width: 40 },
            { header: 'PJ', key: 'pj', width: 20 }
        ];

        // Header style
        sheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
        sheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF2563EB' } };

        data.forEach(item => {
            sheet.addRow({
                tanggal: item.tanggal ? new Date(item.tanggal).toLocaleDateString('id-ID') : '-',
                no_ticket: item.no_ticket || '-',
                no_jaringan: item.pelanggan ? item.pelanggan.no_jaringan : '-',
                customer: item.pelanggan ? item.pelanggan.nama_pelanggan : '-',
                akses: item.akses || '-',
                rincian: item.rincian || '-',
                status: item.status || '-',
                keterangan: item.keterangan || '-',
                pj: item.pj || '-'
            });
        });

        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', 'attachment; filename=Pending_GGN_' + new Date().toISOString().slice(0, 10) + '.xlsx');

        await workbook.xlsx.write(res);
        res.end();

    } catch (error) {
        console.error('Export Error:', error);
        req.flash('error_msg', 'Gagal export data');
        res.redirect('/pending-ggn');
    }
});

router.get('/', async (req, res) => {
    try {
        const { search, status } = req.query;
        let where = {};
        if (search) {
            where[Op.or] = [
                { no_ticket: { [Op.like]: `%${search}%` } },
                { '$pelanggan.nama_pelanggan$': { [Op.like]: `%${search}%` } },
                { '$pelanggan.no_jaringan$': { [Op.like]: `%${search}%` } }
            ];
        }
        if (status) { where.status = status; }
        const { rows, pagination } = await paginate(PendingGgn, req, {
            where,
            order: [['tanggal', 'DESC']],
            include: [{ model: Pelanggan, as: 'pelanggan' }],
            subQuery: false
        });
        res.render('pending-ggn/index', { title: 'Pending GGN & PM - SIMPELL', data: rows, pagination, search: search || '', status: status || '', statuses: STATUSES });
    } catch (error) { req.flash('error_msg', 'Gagal memuat data'); res.redirect('/'); }
});

router.get('/create', isEditor, async (req, res) => {
    const cases = await PendingGgn.findAll({ attributes: ['case_type'], group: ['case_type'], raw: true });
    const dbAkses = await PendingGgn.findAll({ attributes: ['akses'], group: ['akses'], raw: true });
    const allAkses = [...new Set([...AKSES_TYPES, ...dbAkses.map(a => a.akses).filter(Boolean)])].sort();
    const pelangganList = await Pelanggan.findAll({
        attributes: ['id', 'no_jaringan', 'nama_pelanggan'],
        order: [['nama_pelanggan', 'ASC']]
    });

    res.render('pending-ggn/form', {
        title: 'Tambah Pending GGN - SIMPELL',
        data: null,
        caseTypes: cases.map(c => c.case_type).filter(Boolean),
        statuses: STATUSES,
        aksesTypes: allAkses,
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

        await PendingGgn.create(payload);
        req.flash('success_msg', 'Data berhasil ditambahkan');
        res.redirect('/pending-ggn');
    } catch (error) {
        console.error('Create Pending GGN Error:', error);
        req.flash('error_msg', 'Gagal menambahkan data: ' + error.message);
        res.redirect('/pending-ggn/create');
    }
});

router.get('/:id/edit', isEditor, async (req, res) => {
    try {
        const data = await PendingGgn.findByPk(req.params.id, {
            include: [{ model: Pelanggan, as: 'pelanggan' }]
        });
        if (!data) { req.flash('error_msg', 'Data tidak ditemukan'); return res.redirect('/pending-ggn'); }

        const cases = await PendingGgn.findAll({ attributes: ['case_type'], group: ['case_type'], raw: true });
        const dbAkses = await PendingGgn.findAll({ attributes: ['akses'], group: ['akses'], raw: true });
        const allAkses = [...new Set([...AKSES_TYPES, ...dbAkses.map(a => a.akses).filter(Boolean)])].sort();
        const pelangganList = await Pelanggan.findAll({
            attributes: ['id', 'no_jaringan', 'nama_pelanggan'],
            order: [['nama_pelanggan', 'ASC']]
        });

        res.render('pending-ggn/form', {
            title: 'Edit Pending GGN - SIMPELL',
            data,
            caseTypes: cases.map(c => c.case_type).filter(Boolean),
            statuses: STATUSES,
            aksesTypes: allAkses,
            statuses: STATUSES,
            aksesTypes: allAkses,
            pelangganList,
            returnUrl: req.query.return_url
        });

    } catch (error) { res.redirect('/pending-ggn'); }
});

router.get('/:id', async (req, res) => {
    try {
        const data = await PendingGgn.findByPk(req.params.id, {
            include: [{ model: Pelanggan, as: 'pelanggan' }]
        });
        if (!data) { req.flash('error_msg', 'Data tidak ditemukan'); return res.redirect('/pending-ggn'); }

        const cases = await PendingGgn.findAll({ attributes: ['case_type'], group: ['case_type'], raw: true });
        const dbAkses = await PendingGgn.findAll({ attributes: ['akses'], group: ['akses'], raw: true });
        const allAkses = [...new Set([...AKSES_TYPES, ...dbAkses.map(a => a.akses).filter(Boolean)])].sort();
        const pelangganList = await Pelanggan.findAll({
            attributes: ['id', 'no_jaringan', 'nama_pelanggan'],
            order: [['nama_pelanggan', 'ASC']]
        });

        res.render('pending-ggn/detail', {
            title: 'Detail Pending GGN - SIMPELL',
            data,
            caseTypes: cases.map(c => c.case_type).filter(Boolean),
            statuses: STATUSES,
            aksesTypes: allAkses,
            pelangganList,
            readonly: true
        });
    } catch (error) { res.redirect('/pending-ggn'); }
});

router.put('/:id', isEditor, async (req, res) => {
    try {
        const payload = {
            ...req.body,
            pelanggan_id: req.body.pelanggan_id || null
        };

        if (payload.pelanggan_id === '') payload.pelanggan_id = null;

        await PendingGgn.update(payload, { where: { id: req.params.id } });
        req.flash('success_msg', 'Data berhasil diperbarui');
        req.flash('success_msg', 'Data berhasil diperbarui');
        if (req.query.return_url) {
            return res.redirect(req.query.return_url);
        }
        res.redirect('/pending-ggn');
    } catch (error) {
        console.error('Update Pending GGN Error:', error);
        req.flash('error_msg', 'Gagal memperbarui data: ' + error.message);
        res.redirect(`/pending-ggn/${req.params.id}/edit`);
    }
});

router.delete('/:id', isEditor, async (req, res) => {
    try {
        await PendingGgn.destroy({ where: { id: req.params.id } });
        req.flash('success_msg', 'Data berhasil dihapus');
        if (req.query.return_url) {
            return res.redirect(req.query.return_url);
        }
    }
    catch (error) { req.flash('error_msg', 'Gagal menghapus'); }
    res.redirect('/pending-ggn');
});

module.exports = router;
