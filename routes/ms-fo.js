const express = require('express');
const router = express.Router();
const ExcelJS = require('exceljs');
const sequelize = require('../config/database');
const { MsFo } = require('../models');
const { isEditor } = require('../middleware/auth');
const { paginate } = require('../utils/paginate');
const logActivity = require('../utils/activityLogger');
const { cleanText, cleanNumber } = require('../utils/sheetValue');
const { readList, buildWhere, columnMeta, listHref } = require('../utils/listState');

const BASE = '/ms-fo';
const STATUSES = ['Active', 'Inactive', 'Suspended'];
const PJ = ['JOINTER', 'TA'];
const COLUMNS = [
    { key: 'nomor', label: 'No.' },
    { key: 'no_jaringan', label: 'No Jaringan' },
    { key: 'customer', label: 'Customer' },
    { key: 'service', label: 'Service' },
    { key: 'bandwidth', label: 'Bandwidth' },
    { key: 'akses', label: 'Akses' },
    { key: 'node', label: 'Node' },
    { key: 'status', label: 'Status' },
    { key: 'kota', label: 'Kota' },
    { key: 'lat_long', label: 'Lat Long' },
    { key: 'keterangan', label: 'Keterangan' },
    { key: 'pj', label: 'PJ MS FO' }
];
const SEARCH_FIELDS = ['no_jaringan', 'customer', 'service', 'bandwidth', 'akses', 'node', 'kota', 'lat_long', 'pj', 'keterangan'];
const LIST_OPTIONS = {
    statuses: STATUSES,
    sort: 'nomor',
    dir: 'asc',
    sequelize,
    searchFields: SEARCH_FIELDS,
    numericFields: ['nomor']
};

function payloadFrom(body) {
    return {
        nomor: cleanNumber(body.nomor),
        no_jaringan: cleanText(body.no_jaringan, 100),
        customer: cleanText(body.customer, 255),
        service: cleanText(body.service, 100),
        bandwidth: cleanText(body.bandwidth, 50),
        akses: cleanText(body.akses, 100),
        node: cleanText(body.node, 100),
        status: cleanText(body.status, 50) || 'Active',
        kota: cleanText(body.kota, 100),
        lat_long: cleanText(body.lat_long, 255),
        pj: cleanText(body.pj, 100),
        keterangan: cleanText(body.keterangan)
    };
}

async function choiceLists() {
    const rows = await MsFo.findAll({
        attributes: ['service', 'akses', 'node', 'kota', 'pj', 'status'],
        raw: true
    });
    const unique = (key, extras = []) => [...new Set([
        ...extras,
        ...rows.map((row) => row[key]).filter(Boolean)
    ])].sort((a, b) => String(a).localeCompare(String(b), 'id'));
    return {
        service: unique('service'),
        akses: unique('akses', ['Akses FO']),
        node: unique('node'),
        kota: unique('kota'),
        pj: unique('pj', PJ),
        status: unique('status', STATUSES)
    };
}

function fieldsFor(lists) {
    const text = (name, label, extra = {}) => ({ name, label, type: 'text', ...extra });
    return [
        { name: 'nomor', label: 'No.', type: 'number', placeholder: 'Nomor urut sheet' },
        text('no_jaringan', 'No Jaringan', { required: true, placeholder: 'Nomor jaringan' }),
        text('customer', 'Customer', { required: true, wide: true, placeholder: 'Nama customer' }),
        text('service', 'Service', { list: 'service', placeholder: 'Contoh: VPN, INET' }),
        text('bandwidth', 'Bandwidth', { placeholder: 'Contoh: 20 Mbps' }),
        text('akses', 'Akses', { list: 'akses', placeholder: 'Contoh: Akses FO' }),
        text('node', 'Node', { list: 'node', placeholder: 'Contoh: BTMGPNXR01' }),
        text('kota', 'Kota', { list: 'kota', placeholder: 'Contoh: BATAM' }),
        text('lat_long', 'Lat Long', { placeholder: 'Koordinat' }),
        { name: 'status', label: 'Status', type: 'select', options: lists.status, default: 'Active' },
        { name: 'keterangan', label: 'Keterangan', type: 'textarea', wide: true },
        text('pj', 'PJ MS FO', { list: 'pj', placeholder: 'JOINTER, TA, atau ketik PJ baru' })
    ];
}

async function statusCounts(where) {
    const grouped = await MsFo.count({ where, group: ['status'] });
    const counts = { Active: 0, Inactive: 0, Suspended: 0 };
    let total = 0;
    grouped.forEach((row) => {
        const count = Number(row.count) || 0;
        total += count;
        if (Object.prototype.hasOwnProperty.call(counts, row.status)) counts[row.status] = count;
    });
    return [
        { label: 'Total', value: total, tone: 'blue' },
        { label: 'Active', value: counts.Active, tone: 'green' },
        { label: 'Inactive', value: counts.Inactive, tone: 'gray' },
        { label: 'Suspended', value: counts.Suspended, tone: 'red' }
    ];
}

function sheetColumns() {
    return [
        { header: 'NO.', key: 'nomor', width: 8 },
        { header: 'NO JARINGAN', key: 'no_jaringan', width: 18 },
        { header: 'CUSTOMER', key: 'customer', width: 42 },
        { header: 'SERVICE', key: 'service', width: 22 },
        { header: 'BANDWIDTH', key: 'bandwidth', width: 14 },
        { header: 'AKSES', key: 'akses', width: 16 },
        { header: 'NODE', key: 'node', width: 16 },
        { header: 'STATUS', key: 'status', width: 14 },
        { header: 'KOTA', key: 'kota', width: 16 },
        { header: 'LAT LONG', key: 'lat_long', width: 28 },
        { header: 'PJ MS FO', key: 'pj', width: 14 },
        { header: 'KETERANGAN', key: 'keterangan', width: 40 }
    ];
}

router.get('/export', async (req, res) => {
    try {
        const state = readList(req.query, COLUMNS, LIST_OPTIONS);
        const data = await MsFo.findAll({
            where: buildWhere(state, LIST_OPTIONS),
            order: [[state.sortKey, state.dir], ['id', 'ASC']]
        });
        const workbook = new ExcelJS.Workbook();
        const sheet = workbook.addWorksheet('DATA MS FO KEPRI');
        sheet.columns = sheetColumns();
        sheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
        sheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF2563EB' } };
        data.forEach((item) => {
            sheet.addRow({
                nomor: item.nomor,
                no_jaringan: item.no_jaringan || '',
                customer: item.customer || '',
                service: item.service || '',
                bandwidth: item.bandwidth || '',
                akses: item.akses || '',
                node: item.node || '',
                status: item.status || '',
                kota: item.kota || '',
                lat_long: item.lat_long || '',
                pj: item.pj || '',
                keterangan: item.keterangan || ''
            });
        });
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', 'attachment; filename=DATA_MS_FO_KEPRI.xlsx');
        await workbook.xlsx.write(res);
        res.end();
    } catch (error) {
        console.error('Export MS FO Error:', error);
        req.flash('error_msg', 'Gagal export data');
        res.redirect(BASE);
    }
});

router.get('/', async (req, res) => {
    try {
        const state = readList(req.query, COLUMNS, LIST_OPTIONS);
        const where = buildWhere(state, LIST_OPTIONS);
        const { rows, pagination } = await paginate(MsFo, req, {
            where,
            order: [[state.sortKey, state.dir], ['id', 'ASC']]
        });
        res.render('sheet/index', {
            title: 'Data MS FO Kepri - SIMPELL',
            heading: 'Data MS FO Kepri',
            subtitle: 'No jaringan, customer, service, bandwidth, akses, node, status, kota, lat long, PJ, dan keterangan',
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
            searchPlaceholder: 'Cari no jaringan, customer, service, node, kota...'
        });
    } catch (error) {
        console.error('MS FO List Error:', error);
        req.flash('error_msg', 'Gagal memuat data MS FO');
        res.redirect('/dashboard');
    }
});

router.get('/create', isEditor, async (req, res) => {
    const lists = await choiceLists();
    res.render('sheet/form', {
        title: 'Tambah Data MS FO Kepri - SIMPELL',
        heading: 'Tambah Data MS FO Kepri',
        base: BASE,
        data: null,
        fields: fieldsFor(lists),
        lists
    });
});

router.post('/', isEditor, async (req, res) => {
    try {
        const payload = payloadFrom(req.body);
        if (!payload.no_jaringan || !payload.customer) {
            req.flash('error_msg', 'No jaringan dan customer wajib diisi');
            return res.redirect(BASE + '/create');
        }
        const created = await MsFo.create(payload);
        await logActivity(req, 'CREATE', `Menambah MS FO: ${created.no_jaringan || created.customer}`, 'ms_fo', created.id);
        req.flash('success_msg', 'Data MS FO berhasil ditambahkan');
        res.redirect(BASE);
    } catch (error) {
        console.error('Create MS FO Error:', error);
        req.flash('error_msg', 'Gagal menambahkan data: ' + error.message);
        res.redirect(BASE + '/create');
    }
});

router.get('/:id/edit', isEditor, async (req, res) => {
    const data = await MsFo.findByPk(req.params.id);
    if (!data) {
        req.flash('error_msg', 'Data tidak ditemukan');
        return res.redirect(BASE);
    }
    const lists = await choiceLists();
    res.render('sheet/form', {
        title: 'Edit Data MS FO Kepri - SIMPELL',
        heading: 'Edit Data MS FO Kepri',
        base: BASE,
        data,
        fields: fieldsFor(lists),
        lists
    });
});

router.get('/:id', async (req, res) => {
    const data = await MsFo.findByPk(req.params.id);
    if (!data) {
        req.flash('error_msg', 'Data tidak ditemukan');
        return res.redirect(BASE);
    }
    const lists = await choiceLists();
    res.render('sheet/detail', {
        title: 'Detail Data MS FO Kepri - SIMPELL',
        heading: 'Detail Data MS FO Kepri',
        base: BASE,
        data,
        fields: fieldsFor(lists)
    });
});

router.put('/:id', isEditor, async (req, res) => {
    try {
        const data = await MsFo.findByPk(req.params.id);
        if (!data) {
            req.flash('error_msg', 'Data tidak ditemukan');
            return res.redirect(BASE);
        }
        const payload = payloadFrom(req.body);
        if (!payload.no_jaringan || !payload.customer) {
            req.flash('error_msg', 'No jaringan dan customer wajib diisi');
            return res.redirect(`${BASE}/${data.id}/edit`);
        }
        await data.update(payload);
        await logActivity(req, 'UPDATE', `Mengubah MS FO: ${data.no_jaringan || data.customer}`, 'ms_fo', data.id);
        req.flash('success_msg', 'Data MS FO berhasil diperbarui');
        res.redirect(BASE);
    } catch (error) {
        console.error('Update MS FO Error:', error);
        req.flash('error_msg', 'Gagal memperbarui data: ' + error.message);
        res.redirect(`${BASE}/${req.params.id}/edit`);
    }
});

router.delete('/:id', isEditor, async (req, res) => {
    try {
        const data = await MsFo.findByPk(req.params.id);
        if (data) {
            await logActivity(req, 'DELETE', `Menghapus MS FO: ${data.no_jaringan || data.customer}`, 'ms_fo', data.id);
            await data.destroy();
        }
        req.flash('success_msg', 'Data MS FO berhasil dihapus');
    } catch (error) {
        req.flash('error_msg', 'Gagal menghapus data');
    }
    res.redirect(BASE);
});

module.exports = router;
