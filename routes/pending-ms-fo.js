const express = require('express');
const router = express.Router();
const ExcelJS = require('exceljs');
const sequelize = require('../config/database');
const { PendingMsFo } = require('../models');
const { isEditor } = require('../middleware/auth');
const { paginate } = require('../utils/paginate');
const logActivity = require('../utils/activityLogger');
const { cleanText, parseDisplayDate } = require('../utils/sheetValue');
const { readList, buildWhere, columnMeta, listHref } = require('../utils/listState');

const BASE = '/pending-ms-fo';
const STATUSES = ['Pending', 'Progress', 'Done'];
const PJ = ['JOINTER', 'TA'];
const COLUMNS = [
    { key: 'tanggal', label: 'Tanggal' },
    { key: 'no_ticket', label: 'No Ticket' },
    { key: 'no_jaringan', label: 'No Jaringan' },
    { key: 'customer', label: 'Customer' },
    { key: 'rincian', label: 'Rincian' },
    { key: 'akses', label: 'Akses' },
    { key: 'status', label: 'Status' },
    { key: 'keterangan', label: 'Keterangan' },
    { key: 'pj', label: 'PJ' }
];
const SEARCH_FIELDS = ['no_ticket', 'no_jaringan', 'customer', 'rincian', 'akses', 'pj', 'keterangan'];
const LIST_OPTIONS = {
    statuses: STATUSES,
    sort: 'tanggal',
    dir: 'desc',
    sequelize,
    searchFields: SEARCH_FIELDS,
    dateField: 'tanggal'
};

function payloadFrom(body) {
    return {
        tanggal: parseDisplayDate(body.tanggal),
        no_ticket: cleanText(body.no_ticket, 100),
        no_jaringan: cleanText(body.no_jaringan, 100),
        customer: cleanText(body.customer, 255),
        rincian: cleanText(body.rincian),
        akses: cleanText(body.akses, 100),
        pj: cleanText(body.pj, 100),
        status: cleanText(body.status, 50) || 'Pending',
        keterangan: cleanText(body.keterangan)
    };
}

async function choiceLists() {
    const rows = await PendingMsFo.findAll({
        attributes: ['no_jaringan', 'customer', 'akses', 'pj', 'status'],
        raw: true
    });
    const unique = (key, extras = []) => [...new Set([
        ...extras,
        ...rows.map((row) => row[key]).filter(Boolean)
    ])].sort((a, b) => String(a).localeCompare(String(b), 'id'));
    return {
        no_jaringan: unique('no_jaringan'),
        customer: unique('customer'),
        akses: unique('akses', ['FO']),
        pj: unique('pj', PJ),
        status: unique('status', STATUSES)
    };
}

function fieldsFor(lists) {
    return [
        { name: 'tanggal', label: 'Tanggal', type: 'date', required: true },
        { name: 'no_ticket', label: 'No Ticket', type: 'text', placeholder: 'Nomor tiket' },
        { name: 'no_jaringan', label: 'No Jaringan', type: 'text', list: 'no_jaringan', placeholder: 'Contoh: TARGET - 15' },
        { name: 'customer', label: 'Customer', type: 'text', list: 'customer', placeholder: 'Contoh: PM REMOTE' },
        { name: 'akses', label: 'Akses', type: 'text', list: 'akses', placeholder: 'Contoh: FO' },
        { name: 'status', label: 'Status', type: 'select', options: lists.status, default: 'Pending' },
        { name: 'rincian', label: 'Rincian', type: 'textarea', wide: true },
        { name: 'keterangan', label: 'Keterangan', type: 'textarea', wide: true },
        { name: 'pj', label: 'PJ', type: 'text', list: 'pj', placeholder: 'JOINTER, TA, atau ketik PJ baru' }
    ];
}

async function statusCounts(where) {
    const grouped = await PendingMsFo.count({ where, group: ['status'] });
    const counts = { Pending: 0, Progress: 0, Done: 0 };
    let total = 0;
    grouped.forEach((row) => {
        const count = Number(row.count) || 0;
        total += count;
        if (Object.prototype.hasOwnProperty.call(counts, row.status)) counts[row.status] = count;
    });
    return [
        { label: 'Total', value: total, tone: 'blue' },
        { label: 'Pending', value: counts.Pending, tone: 'yellow' },
        { label: 'Progress', value: counts.Progress, tone: 'blue' },
        { label: 'Done', value: counts.Done, tone: 'green' }
    ];
}

function displayDate(value) {
    const [year, month, day] = String(value || '').split('-');
    if (!day) return '';
    return `${Number(day)}/${Number(month)}/${year}`;
}

router.get('/export', async (req, res) => {
    try {
        const state = readList(req.query, COLUMNS, LIST_OPTIONS);
        const data = await PendingMsFo.findAll({
            where: buildWhere(state, LIST_OPTIONS),
            order: [[state.sortKey, state.dir], ['id', 'ASC']]
        });
        const workbook = new ExcelJS.Workbook();
        const sheet = workbook.addWorksheet('PENDINGAN MS FO KEPRI');
        sheet.columns = [
            { header: 'TANGGAL', key: 'tanggal', width: 14 },
            { header: 'NO TICKET', key: 'no_ticket', width: 20 },
            { header: 'NO JARINGAN', key: 'no_jaringan', width: 22 },
            { header: 'CUSTOMER', key: 'customer', width: 28 },
            { header: 'RINCIAN', key: 'rincian', width: 48 },
            { header: 'AKSES', key: 'akses', width: 14 },
            { header: 'PJ', key: 'pj', width: 14 },
            { header: 'Status', key: 'status', width: 14 },
            { header: 'Keterangan', key: 'keterangan', width: 48 }
        ];
        sheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
        sheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF2563EB' } };
        data.forEach((item) => {
            sheet.addRow({
                tanggal: displayDate(item.tanggal),
                no_ticket: item.no_ticket || '',
                no_jaringan: item.no_jaringan || '',
                customer: item.customer || '',
                rincian: item.rincian || '',
                akses: item.akses || '',
                pj: item.pj || '',
                status: item.status || '',
                keterangan: item.keterangan || ''
            });
        });
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', 'attachment; filename=PENDINGAN_MS_FO_KEPRI.xlsx');
        await workbook.xlsx.write(res);
        res.end();
    } catch (error) {
        console.error('Export Pending MS FO Error:', error);
        req.flash('error_msg', 'Gagal export data');
        res.redirect(BASE);
    }
});

router.get('/', async (req, res) => {
    try {
        const state = readList(req.query, COLUMNS, LIST_OPTIONS);
        const { rows, pagination } = await paginate(PendingMsFo, req, {
            where: buildWhere(state, LIST_OPTIONS),
            order: [[state.sortKey, state.dir], ['id', 'ASC']]
        });
        res.render('sheet/index', {
            title: 'Pendingan MS FO Kepri - SIMPELL',
            heading: 'Pendingan MS FO Kepri',
            subtitle: 'Tanggal, no tiket, no jaringan, customer, rincian, akses, PJ, status, dan keterangan',
            base: BASE,
            data: rows,
            pagination,
            search: state.search,
            status: state.status,
            statuses: state.statuses,
            filters: state.filters,
            sort: state.sorting ? state.sortKey : '',
            dir: state.sorting ? state.dir.toLowerCase() : '',
            exportHref: listHref(BASE + '/export', state),
            columns: columnMeta(BASE, state, COLUMNS),
            stats: await statusCounts(buildWhere(state, { ...LIST_OPTIONS, withStatus: false })),
            searchPlaceholder: 'Cari tiket, jaringan, customer, rincian, PJ...'
        });
    } catch (error) {
        console.error('Pending MS FO List Error:', error);
        req.flash('error_msg', 'Gagal memuat data pendingan MS FO');
        res.redirect('/dashboard');
    }
});

router.get('/create', isEditor, async (req, res) => {
    const lists = await choiceLists();
    res.render('sheet/form', {
        title: 'Tambah Pendingan MS FO Kepri - SIMPELL',
        heading: 'Tambah Pendingan MS FO Kepri',
        base: BASE,
        data: null,
        fields: fieldsFor(lists),
        lists
    });
});

router.post('/', isEditor, async (req, res) => {
    try {
        const payload = payloadFrom(req.body);
        if (!payload.tanggal) {
            req.flash('error_msg', 'Tanggal wajib diisi');
            return res.redirect(BASE + '/create');
        }
        const created = await PendingMsFo.create(payload);
        await logActivity(req, 'CREATE', `Menambah pendingan MS FO: ${created.no_ticket || created.customer || created.tanggal}`, 'pending_ms_fo', created.id);
        req.flash('success_msg', 'Data pendingan MS FO berhasil ditambahkan');
        res.redirect(BASE);
    } catch (error) {
        console.error('Create Pending MS FO Error:', error);
        req.flash('error_msg', 'Gagal menambahkan data: ' + error.message);
        res.redirect(BASE + '/create');
    }
});

router.get('/:id/edit', isEditor, async (req, res) => {
    const data = await PendingMsFo.findByPk(req.params.id);
    if (!data) {
        req.flash('error_msg', 'Data tidak ditemukan');
        return res.redirect(BASE);
    }
    const lists = await choiceLists();
    res.render('sheet/form', {
        title: 'Edit Pendingan MS FO Kepri - SIMPELL',
        heading: 'Edit Pendingan MS FO Kepri',
        base: BASE,
        data,
        fields: fieldsFor(lists),
        lists
    });
});

router.get('/:id', async (req, res) => {
    const data = await PendingMsFo.findByPk(req.params.id);
    if (!data) {
        req.flash('error_msg', 'Data tidak ditemukan');
        return res.redirect(BASE);
    }
    const lists = await choiceLists();
    res.render('sheet/detail', {
        title: 'Detail Pendingan MS FO Kepri - SIMPELL',
        heading: 'Detail Pendingan MS FO Kepri',
        base: BASE,
        data,
        fields: fieldsFor(lists)
    });
});

router.put('/:id', isEditor, async (req, res) => {
    try {
        const data = await PendingMsFo.findByPk(req.params.id);
        if (!data) {
            req.flash('error_msg', 'Data tidak ditemukan');
            return res.redirect(BASE);
        }
        const payload = payloadFrom(req.body);
        if (!payload.tanggal) {
            req.flash('error_msg', 'Tanggal wajib diisi');
            return res.redirect(`${BASE}/${data.id}/edit`);
        }
        await data.update(payload);
        await logActivity(req, 'UPDATE', `Mengubah pendingan MS FO: ${data.no_ticket || data.customer || data.tanggal}`, 'pending_ms_fo', data.id);
        req.flash('success_msg', 'Data pendingan MS FO berhasil diperbarui');
        res.redirect(BASE);
    } catch (error) {
        console.error('Update Pending MS FO Error:', error);
        req.flash('error_msg', 'Gagal memperbarui data: ' + error.message);
        res.redirect(`${BASE}/${req.params.id}/edit`);
    }
});

router.delete('/:id', isEditor, async (req, res) => {
    try {
        const data = await PendingMsFo.findByPk(req.params.id);
        if (data) {
            await logActivity(req, 'DELETE', `Menghapus pendingan MS FO: ${data.no_ticket || data.customer || data.tanggal}`, 'pending_ms_fo', data.id);
            await data.destroy();
        }
        req.flash('success_msg', 'Data pendingan MS FO berhasil dihapus');
    } catch (error) {
        req.flash('error_msg', 'Gagal menghapus data');
    }
    res.redirect(BASE);
});

module.exports = router;
