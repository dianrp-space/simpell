const express = require('express');
const router = express.Router();
const ExcelJS = require('exceljs');
const sequelize = require('../config/database');
const { PmMsFo } = require('../models');
const pelangganChoices = require('../utils/pelangganChoices');
const { isEditor } = require('../middleware/auth');
const { paginate } = require('../utils/paginate');
const logActivity = require('../utils/activityLogger');
const { cleanText, cleanNumber, parseDisplayDate } = require('../utils/sheetValue');
const { readList, buildWhere, columnMeta, listHref } = require('../utils/listState');

const BASE = '/pm-ms-fo';
const JENIS = ['PM ODP', 'PM CLOSURE', 'PM REMOTE'];
const PJ = ['JOINTER', 'TA'];
const COLUMNS = [
    { key: 'jenis', label: 'Jenis' },
    { key: 'periode', label: 'Periode' },
    { key: 'tanggal', label: 'Tanggal' },
    { key: 'no_ticket', label: 'No Ticket' },
    { key: 'no_jaringan', label: 'No Jaringan' },
    { key: 'customer', label: 'Customer' },
    { key: 'rincian', label: 'Rincian' },
    { key: 'pj', label: 'PJ' }
];
const SEARCH_FIELDS = ['judul', 'jenis', 'periode', 'no_ticket', 'no_jaringan', 'customer', 'rincian', 'pj'];
const LIST_OPTIONS = {
    statuses: JENIS,
    statusField: 'jenis',
    sort: 'urutan',
    dir: 'asc',
    sequelize,
    searchFields: SEARCH_FIELDS,
    dateField: 'tanggal'
};

function judulFrom(payload) {
    if (!payload.jenis) return null;
    const target = payload.target ? ` [Target ${payload.target}]` : '';
    return payload.periode ? `${payload.jenis} - ${payload.periode}${target}` : payload.jenis;
}

function payloadFrom(body) {
    const payload = {
        jenis: cleanText(body.jenis, 100),
        periode: cleanText(body.periode, 100),
        target: cleanNumber(body.target),
        tanggal: parseDisplayDate(body.tanggal),
        no_ticket: cleanText(body.no_ticket, 100),
        no_jaringan: cleanText(body.no_jaringan, 100),
        customer: cleanText(body.customer, 255),
        rincian: cleanText(body.rincian),
        pj: cleanText(body.pj, 100)
    };
    payload.judul = judulFrom(payload);
    return payload;
}

function isFilled(row) {
    return Boolean(row.tanggal || row.no_ticket || row.no_jaringan || row.customer || row.rincian || row.pj);
}

async function choiceLists() {
    const rows = await PmMsFo.findAll({
        attributes: ['jenis', 'periode', 'pj'],
        raw: true
    });
    const unique = (key, extras = []) => [...new Set([
        ...extras,
        ...rows.map((row) => row[key]).filter(Boolean)
    ])].sort((a, b) => String(a).localeCompare(String(b), 'id'));
    return {
        jenis: unique('jenis', JENIS),
        periode: unique('periode'),
        pj: unique('pj', PJ)
    };
}

function fieldsFor(lists) {
    return [
        { name: 'jenis', label: 'Jenis', type: 'text', list: 'jenis', required: true, placeholder: 'Contoh: PM ODP' },
        { name: 'periode', label: 'Periode', type: 'text', list: 'periode', placeholder: 'Contoh: OKTOBER 2026' },
        { name: 'target', label: 'Target', type: 'number', placeholder: 'Jumlah target blok' },
        { name: 'tanggal', label: 'Tanggal', type: 'date', optional: true },
        { name: 'no_ticket', label: 'No Ticket', type: 'text', placeholder: 'Nomor tiket' },
        { name: 'no_jaringan', label: 'No Jaringan', type: 'customer', wide: true, placeholder: 'Cari nomor jaringan atau customer' },
        { name: 'customer', label: 'Customer', type: 'text', wide: true, placeholder: 'Terisi saat nomor jaringan dipilih' },
        { name: 'rincian', label: 'Rincian', type: 'textarea', wide: true },
        { name: 'pj', label: 'PJ', type: 'text', list: 'pj', placeholder: 'JOINTER, TA, atau ketik PJ baru' }
    ];
}

async function blockCounts(where) {
    const rows = await PmMsFo.findAll({
        where,
        attributes: ['jenis', 'tanggal', 'no_ticket', 'no_jaringan', 'customer', 'rincian', 'pj'],
        raw: true
    });
    const groups = new Map();
    rows.forEach((row) => {
        const key = row.jenis || 'Lainnya';
        if (!groups.has(key)) groups.set(key, { total: 0, filled: 0 });
        const group = groups.get(key);
        group.total += 1;
        if (isFilled(row)) group.filled += 1;
    });
    const cards = [
        { label: 'Total slot', value: rows.length, tone: 'blue' },
        { label: 'Terisi', value: rows.filter(isFilled).length, tone: 'green' }
    ];
    JENIS.forEach((jenis) => {
        const group = groups.get(jenis) || { total: 0, filled: 0 };
        cards.push({ label: jenis, value: `${group.filled}/${group.total}`, tone: 'yellow' });
    });
    return cards;
}

function displayDate(value) {
    const [year, month, day] = String(value || '').split('-');
    if (!day) return '';
    return `${Number(day)}/${Number(month)}/${year}`;
}

function writeBlocks(sheet, rows) {
    const headers = ['NO.', 'TANGGAL', 'NO TICKET', 'NO JARINGAN', 'CUSTOMER', 'RINCIAN', 'PJ'];
    const groups = [];
    rows.forEach((row) => {
        const key = row.judul || row.jenis || 'PM';
        const last = groups[groups.length - 1];
        if (!last || last.key !== key) groups.push({ key, rows: [row] });
        else last.rows.push(row);
    });
    let cursor = 1;
    groups.forEach((group) => {
        sheet.mergeCells(cursor, 1, cursor, headers.length);
        const title = sheet.getCell(cursor, 1);
        title.value = group.key;
        title.font = { bold: true, color: { argb: 'FFFFFFFF' } };
        title.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1D4ED8' } };
        cursor += 1;
        headers.forEach((header, index) => {
            const cell = sheet.getCell(cursor, index + 1);
            cell.value = header;
            cell.font = { bold: true };
        });
        cursor += 1;
        group.rows.forEach((row) => {
            const values = [
                row.nomor || '',
                displayDate(row.tanggal),
                row.no_ticket || '',
                row.no_jaringan || '',
                row.customer || '',
                row.rincian || '',
                row.pj || ''
            ];
            values.forEach((value, index) => {
                sheet.getCell(cursor, index + 1).value = value;
            });
            cursor += 1;
        });
        cursor += 1;
    });
    [10, 16, 20, 18, 40, 64, 16].forEach((width, index) => {
        sheet.getColumn(index + 1).width = width;
    });
}

router.get('/export', async (req, res) => {
    try {
        const state = readList(req.query, COLUMNS, LIST_OPTIONS);
        const data = await PmMsFo.findAll({
            where: buildWhere(state, LIST_OPTIONS),
            order: [['urutan', 'ASC'], ['id', 'ASC']]
        });
        const workbook = new ExcelJS.Workbook();
        const sheet = workbook.addWorksheet('DATA PM MS FO KEPRI');
        writeBlocks(sheet, data);
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', 'attachment; filename=DATA_PM_MS_FO_KEPRI.xlsx');
        await workbook.xlsx.write(res);
        res.end();
    } catch (error) {
        console.error('Export PM MS FO Error:', error);
        req.flash('error_msg', 'Gagal export data');
        res.redirect(BASE);
    }
});

router.get('/', async (req, res) => {
    try {
        const state = readList(req.query, COLUMNS, LIST_OPTIONS);
        const { rows, pagination } = await paginate(PmMsFo, req, {
            where: buildWhere(state, LIST_OPTIONS),
            order: [[state.sortKey, state.dir], ['id', 'ASC']]
        });
        res.render('sheet/index', {
            title: 'Data PM MS FO Kepri - SIMPELL',
            heading: 'Data PM MS FO Kepri',
            subtitle: 'Blok PM ODP, PM Closure, dan PM Remote: periode, target, tanggal, no tiket, no jaringan, customer, rincian, dan PJ',
            base: BASE,
            data: rows,
            pagination,
            search: state.search,
            status: state.status,
            statuses: state.statuses,
            filterLabel: 'Semua Jenis',
            filters: state.filters,
            sort: state.sorting ? state.sortKey : '',
            dir: state.sorting ? state.dir.toLowerCase() : '',
            exportHref: listHref(BASE + '/export', state),
            columns: columnMeta(BASE, state, COLUMNS),
            stats: await blockCounts(buildWhere(state, { ...LIST_OPTIONS, withStatus: false })),
            searchPlaceholder: 'Cari jenis, periode, tiket, jaringan, customer, rincian, PJ...'
        });
    } catch (error) {
        console.error('PM MS FO List Error:', error);
        req.flash('error_msg', 'Gagal memuat data PM MS FO');
        res.redirect('/dashboard');
    }
});

router.get('/create', isEditor, async (req, res) => {
    const lists = await choiceLists();
    res.render('sheet/form', {
        title: 'Tambah Data PM MS FO Kepri - SIMPELL',
        heading: 'Tambah Data PM MS FO Kepri',
        base: BASE,
        data: null,
        fields: fieldsFor(lists),
        lists,
        pelangganList: await pelangganChoices()
    });
});

router.post('/', isEditor, async (req, res) => {
    try {
        const payload = payloadFrom(req.body);
        if (!payload.jenis) {
            req.flash('error_msg', 'Jenis wajib diisi');
            return res.redirect(BASE + '/create');
        }
        const max = await PmMsFo.max('urutan');
        payload.urutan = (Number(max) || 0) + 1;
        const created = await PmMsFo.create(payload);
        await logActivity(req, 'CREATE', `Menambah PM MS FO: ${created.judul || created.jenis}`, 'pm_ms_fo', created.id);
        req.flash('success_msg', 'Data PM MS FO berhasil ditambahkan');
        res.redirect(BASE);
    } catch (error) {
        console.error('Create PM MS FO Error:', error);
        req.flash('error_msg', 'Gagal menambahkan data: ' + error.message);
        res.redirect(BASE + '/create');
    }
});

router.get('/:id/edit', isEditor, async (req, res) => {
    const data = await PmMsFo.findByPk(req.params.id);
    if (!data) {
        req.flash('error_msg', 'Data tidak ditemukan');
        return res.redirect(BASE);
    }
    const lists = await choiceLists();
    res.render('sheet/form', {
        title: 'Edit Data PM MS FO Kepri - SIMPELL',
        heading: 'Edit Data PM MS FO Kepri',
        base: BASE,
        data,
        fields: fieldsFor(lists),
        lists,
        pelangganList: await pelangganChoices()
    });
});

router.get('/:id', async (req, res) => {
    const data = await PmMsFo.findByPk(req.params.id);
    if (!data) {
        req.flash('error_msg', 'Data tidak ditemukan');
        return res.redirect(BASE);
    }
    const lists = await choiceLists();
    res.render('sheet/detail', {
        title: 'Detail Data PM MS FO Kepri - SIMPELL',
        heading: 'Detail Data PM MS FO Kepri',
        base: BASE,
        data,
        fields: fieldsFor(lists)
    });
});

router.put('/:id', isEditor, async (req, res) => {
    try {
        const data = await PmMsFo.findByPk(req.params.id);
        if (!data) {
            req.flash('error_msg', 'Data tidak ditemukan');
            return res.redirect(BASE);
        }
        const payload = payloadFrom(req.body);
        if (!payload.jenis) {
            req.flash('error_msg', 'Jenis wajib diisi');
            return res.redirect(`${BASE}/${data.id}/edit`);
        }
        await data.update(payload);
        await logActivity(req, 'UPDATE', `Mengubah PM MS FO: ${data.judul || data.jenis}`, 'pm_ms_fo', data.id);
        req.flash('success_msg', 'Data PM MS FO berhasil diperbarui');
        res.redirect(BASE);
    } catch (error) {
        console.error('Update PM MS FO Error:', error);
        req.flash('error_msg', 'Gagal memperbarui data: ' + error.message);
        res.redirect(`${BASE}/${req.params.id}/edit`);
    }
});

router.delete('/:id', isEditor, async (req, res) => {
    try {
        const data = await PmMsFo.findByPk(req.params.id);
        if (data) {
            await logActivity(req, 'DELETE', `Menghapus PM MS FO: ${data.judul || data.jenis}`, 'pm_ms_fo', data.id);
            await data.destroy();
        }
        req.flash('success_msg', 'Data PM MS FO berhasil dihapus');
    } catch (error) {
        req.flash('error_msg', 'Gagal menghapus data');
    }
    res.redirect(BASE);
});

module.exports = router;
