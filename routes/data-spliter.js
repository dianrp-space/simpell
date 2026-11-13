const express = require('express');
const router = express.Router();
const ExcelJS = require('exceljs');
const sequelize = require('../config/database');
const { DataSpliter } = require('../models');
const { isEditor } = require('../middleware/auth');
const { paginate } = require('../utils/paginate');
const logActivity = require('../utils/activityLogger');
const { cleanText, cleanNumber } = require('../utils/sheetValue');
const { readList, buildWhere, columnMeta, listHref } = require('../utils/listState');
const { FIBER_COLORS, colorByPort, findFiberColor, fiberMap, portColorMap } = require('../utils/fiberColors');

const BASE = '/data-spliter';
const COLUMNS = [
    { key: 'lokasi', label: 'Lokasi' },
    { key: 'kartu', label: 'Kartu' },
    { key: 'olt', label: 'OLT' },
    { key: 'tray', label: 'Tray' },
    { key: 'core', label: 'Core' },
    { key: 'no_spliter', label: 'No Spliter' },
    { key: 'port', label: 'Port' },
    { key: 'warna', label: 'Warna' },
    { key: 'deskripsi', label: 'Description' },
    { key: 'destination', label: 'Destination' },
    { key: 'template', label: 'Template' },
    { key: 'keterangan', label: 'Ket.' }
];
const SEARCH_FIELDS = ['lokasi', 'kartu', 'olt', 'tray', 'core', 'no_spliter', 'deskripsi', 'destination', 'template', 'keterangan', 'warna'];
const LIST_OPTIONS = {
    statusField: 'lokasi',
    sort: 'urutan',
    dir: 'asc',
    sequelize,
    searchFields: SEARCH_FIELDS,
    numericFields: ['port']
};

function payloadFrom(body) {
    const port = cleanNumber(body.port);
    const picked = FIBER_COLORS.some((color) => color.key === body.warna) ? body.warna : null;
    const warna = body.warna === 'none' ? null : (picked || (port ? colorByPort(port) : null));
    return {
        lokasi: cleanText(body.lokasi, 150),
        kartu: cleanText(body.kartu, 150),
        olt: cleanText(body.olt, 255),
        tray: cleanText(body.tray, 150),
        core: cleanText(body.core, 150),
        no_spliter: cleanText(body.no_spliter, 255),
        port: port && port > 0 && port < 100 ? port : null,
        warna: warna || null,
        deskripsi: cleanText(body.deskripsi),
        destination: cleanText(body.destination),
        template: cleanText(body.template, 255),
        keterangan: cleanText(body.keterangan)
    };
}

function isEmpty(payload) {
    return !payload.olt && !payload.tray && !payload.core && !payload.no_spliter
        && !payload.port && !payload.deskripsi && !payload.destination
        && !payload.template && !payload.keterangan;
}

async function choiceLists() {
    const rows = await DataSpliter.findAll({
        attributes: ['lokasi', 'kartu', 'olt', 'no_spliter'],
        raw: true
    });
    const unique = (key) => [...new Set(rows.map((row) => row[key]).filter(Boolean))]
        .sort((a, b) => String(a).localeCompare(String(b), 'id'));
    return {
        lokasi: unique('lokasi'),
        kartu: unique('kartu'),
        olt: unique('olt'),
        no_spliter: unique('no_spliter')
    };
}

function fieldsFor(lists) {
    const text = (name, label, extra = {}) => ({ name, label, type: 'text', ...extra });
    return [
        text('lokasi', 'Lokasi', { required: true, list: 'lokasi', placeholder: 'Contoh: SPLITER ODC KALIBAN' }),
        text('kartu', 'Kartu', { list: 'kartu', placeholder: 'Contoh: BTMGPNGA01 CARD 1' }),
        text('olt', 'OLT', { list: 'olt', placeholder: 'Contoh: BTMGPNGA01 OLT 1/3/7' }),
        text('tray', 'Tray', { placeholder: 'Contoh: TRAY 2' }),
        text('core', 'Core', { placeholder: 'Contoh: T2 C 7' }),
        text('no_spliter', 'No Spliter', { list: 'no_spliter', placeholder: 'Contoh: SPLITER 1:8' }),
        { name: 'port', label: 'Port', type: 'number', placeholder: '1–12, mengikuti warna optik' },
        {
            name: 'warna',
            label: 'Warna optik',
            type: 'fiber',
            wide: true,
            options: FIBER_COLORS,
            byPort: portColorMap()
        },
        text('deskripsi', 'Description', { wide: true, placeholder: 'Tujuan atau pemakaian port' }),
        text('destination', 'Destination', { wide: true, placeholder: 'Contoh: TRAY 8 T1 C10' }),
        text('template', 'Template', { placeholder: 'Contoh: [1]_SP 1:8 [1]_OLT 4/2' }),
        { name: 'keterangan', label: 'Ket.', type: 'textarea', wide: true }
    ];
}

async function blockCounts(where) {
    const rows = await DataSpliter.findAll({
        where,
        attributes: ['lokasi', 'warna'],
        raw: true
    });
    const lokasi = new Set(rows.map((row) => row.lokasi).filter(Boolean));
    return [
        { label: 'Total baris', value: rows.length, tone: 'blue' },
        { label: 'Port berwarna', value: rows.filter((row) => row.warna).length, tone: 'green' },
        { label: 'Tanpa warna', value: rows.filter((row) => !row.warna).length, tone: 'gray' },
        { label: 'Lokasi', value: lokasi.size, tone: 'yellow' }
    ];
}

function labelOf(row) {
    const color = findFiberColor(row.warna);
    const port = row.port ? ` port ${row.port}${color ? ' ' + color.label : ''}` : '';
    return `${row.lokasi || 'Spliter'}${row.olt ? ' · ' + row.olt : ''}${port}`;
}

router.get('/export', async (req, res) => {
    try {
        const lists = await choiceLists();
        const state = readList(req.query, COLUMNS, { ...LIST_OPTIONS, statuses: lists.lokasi });
        const data = await DataSpliter.findAll({
            where: buildWhere(state, LIST_OPTIONS),
            order: [['urutan', 'ASC'], ['id', 'ASC']]
        });
        const workbook = new ExcelJS.Workbook();
        const sheet = workbook.addWorksheet('DATA SPLITTER');
        const headers = COLUMNS.map((column) => column.label);
        headers.forEach((header, index) => {
            const cell = sheet.getCell(1, index + 1);
            cell.value = header;
            cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1D4ED8' } };
        });
        data.forEach((row, index) => {
            const color = findFiberColor(row.warna);
            const values = COLUMNS.map((column) => {
                if (column.key === 'warna') return color ? color.label : '';
                return row[column.key] == null ? '' : row[column.key];
            });
            values.forEach((value, column) => {
                const cell = sheet.getCell(index + 2, column + 1);
                cell.value = value;
                if (color && (COLUMNS[column].key === 'port' || COLUMNS[column].key === 'warna')) {
                    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF' + color.hex.slice(1) } };
                    cell.font = { bold: true, color: { argb: color.ink === '#FFFFFF' ? 'FFFFFFFF' : 'FF1F2937' } };
                }
            });
        });
        [22, 22, 28, 16, 14, 24, 10, 14, 36, 28, 28, 28].forEach((width, index) => {
            sheet.getColumn(index + 1).width = width;
        });
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', 'attachment; filename=DATA_SPLITER_KEPRI.xlsx');
        await workbook.xlsx.write(res);
        res.end();
    } catch (error) {
        console.error('Export Data Spliter Error:', error);
        req.flash('error_msg', 'Gagal export data');
        res.redirect(BASE);
    }
});

router.get('/', async (req, res) => {
    try {
        const lists = await choiceLists();
        const options = { ...LIST_OPTIONS, statuses: lists.lokasi };
        const state = readList(req.query, COLUMNS, options);
        const { rows, pagination } = await paginate(DataSpliter, req, {
            where: buildWhere(state, options),
            order: [[state.sortKey, state.dir], ['id', 'ASC']]
        });
        res.render('sheet/index', {
            title: 'Data Spliter - SIMPELL',
            heading: 'Data Spliter',
            subtitle: 'Port splitter fiber optik per lokasi. Warna port mengikuti urutan inti optik, dari biru sampai aqua.',
            base: BASE,
            data: rows,
            pagination,
            search: state.search,
            status: state.status,
            statuses: state.statuses,
            filterLabel: 'Semua Lokasi',
            filters: state.filters,
            sort: state.sorting ? state.sortKey : '',
            dir: state.sorting ? state.dir.toLowerCase() : '',
            exportHref: listHref(BASE + '/export', state),
            columns: columnMeta(BASE, state, COLUMNS),
            stats: await blockCounts(buildWhere(state, { ...options, withStatus: false })),
            searchPlaceholder: 'Cari lokasi, OLT, tray, core, splitter, description...',
            fiberMap: fiberMap(),
            fiberLegend: FIBER_COLORS
        });
    } catch (error) {
        console.error('Data Spliter List Error:', error);
        req.flash('error_msg', 'Gagal memuat data spliter');
        res.redirect('/dashboard');
    }
});

router.get('/create', isEditor, async (req, res) => {
    const lists = await choiceLists();
    res.render('sheet/form', {
        title: 'Tambah Data Spliter - SIMPELL',
        heading: 'Tambah Data Spliter',
        base: BASE,
        data: null,
        fields: fieldsFor(lists),
        lists
    });
});

router.post('/', isEditor, async (req, res) => {
    try {
        const payload = payloadFrom(req.body);
        if (!payload.lokasi) {
            req.flash('error_msg', 'Lokasi wajib diisi');
            return res.redirect(BASE + '/create');
        }
        if (isEmpty(payload)) {
            req.flash('error_msg', 'Isi minimal OLT, tray, core, splitter, atau description');
            return res.redirect(BASE + '/create');
        }
        const max = await DataSpliter.max('urutan');
        payload.urutan = (Number(max) || 0) + 1;
        const created = await DataSpliter.create(payload);
        await logActivity(req, 'CREATE', `Menambah data spliter: ${labelOf(created)}`, 'data_spliter', created.id);
        req.flash('success_msg', 'Data spliter berhasil ditambahkan');
        res.redirect(BASE);
    } catch (error) {
        console.error('Create Data Spliter Error:', error);
        req.flash('error_msg', 'Gagal menambahkan data: ' + error.message);
        res.redirect(BASE + '/create');
    }
});

router.get('/:id/edit', isEditor, async (req, res) => {
    const data = await DataSpliter.findByPk(req.params.id);
    if (!data) {
        req.flash('error_msg', 'Data tidak ditemukan');
        return res.redirect(BASE);
    }
    const lists = await choiceLists();
    res.render('sheet/form', {
        title: 'Edit Data Spliter - SIMPELL',
        heading: 'Edit Data Spliter',
        base: BASE,
        data,
        fields: fieldsFor(lists),
        lists
    });
});

router.get('/:id', async (req, res) => {
    const data = await DataSpliter.findByPk(req.params.id);
    if (!data) {
        req.flash('error_msg', 'Data tidak ditemukan');
        return res.redirect(BASE);
    }
    const lists = await choiceLists();
    res.render('sheet/detail', {
        title: 'Detail Data Spliter - SIMPELL',
        heading: 'Detail Data Spliter',
        base: BASE,
        data,
        fields: fieldsFor(lists),
        fiberMap: fiberMap()
    });
});

router.put('/:id', isEditor, async (req, res) => {
    try {
        const data = await DataSpliter.findByPk(req.params.id);
        if (!data) {
            req.flash('error_msg', 'Data tidak ditemukan');
            return res.redirect(BASE);
        }
        const payload = payloadFrom(req.body);
        if (!payload.lokasi) {
            req.flash('error_msg', 'Lokasi wajib diisi');
            return res.redirect(`${BASE}/${data.id}/edit`);
        }
        if (isEmpty(payload)) {
            req.flash('error_msg', 'Isi minimal OLT, tray, core, splitter, atau description');
            return res.redirect(`${BASE}/${data.id}/edit`);
        }
        await data.update(payload);
        await logActivity(req, 'UPDATE', `Mengubah data spliter: ${labelOf(data)}`, 'data_spliter', data.id);
        req.flash('success_msg', 'Data spliter berhasil diperbarui');
        res.redirect(BASE);
    } catch (error) {
        console.error('Update Data Spliter Error:', error);
        req.flash('error_msg', 'Gagal memperbarui data: ' + error.message);
        res.redirect(`${BASE}/${req.params.id}/edit`);
    }
});

router.delete('/:id', isEditor, async (req, res) => {
    try {
        const data = await DataSpliter.findByPk(req.params.id);
        if (data) {
            await logActivity(req, 'DELETE', `Menghapus data spliter: ${labelOf(data)}`, 'data_spliter', data.id);
            await data.destroy();
        }
        req.flash('success_msg', 'Data spliter berhasil dihapus');
    } catch (error) {
        req.flash('error_msg', 'Gagal menghapus data');
    }
    res.redirect(BASE);
});

module.exports = router;
