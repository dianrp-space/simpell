const fs = require('fs');
const path = require('path');
const ExcelJS = require('exceljs');
const { Op } = require('sequelize');
const Pelanggan = require('../models/Pelanggan');
const ensureSchema = require('./ensureSchema');

const COLUMN_MAP = {
    'no jaringan': 'no_jaringan',
    'no jar': 'no_jaringan',
    nojar: 'no_jaringan',
    customer: 'nama_pelanggan',
    'nama pelanggan': 'nama_pelanggan',
    'nama customer': 'nama_pelanggan',
    service: 'service',
    bandwidth: 'bandwidth',
    bw: 'bandwidth',
    akses: 'akses',
    node: 'node',
    status: 'status',
    kota: 'kota',
    koordinat: 'koordinat',
    'lat long': 'koordinat',
    keterangan: 'keterangan',
    alamat: 'alamat',
    kontak: 'kontak',
    email: 'email'
};

const LIMITS = {
    no_jaringan: 100,
    nama_pelanggan: 255,
    service: 100,
    bandwidth: 50,
    akses: 100,
    node: 100,
    kota: 100,
    koordinat: 255,
    kontak: 50,
    email: 255
};

const SHEET_COLUMNS = [
    'No Jaringan',
    'Customer',
    'Service',
    'Bandwidth',
    'Akses',
    'Node',
    'Status',
    'Kota',
    'Koordinat',
    'Keterangan'
];

function bundledWorkbookPath() {
    return path.join(__dirname, '..', 'SIMPELL.xlsx');
}

function cellText(value) {
    if (value == null) return '';
    if (value instanceof Date) return value.toISOString().slice(0, 10);
    if (typeof value === 'object') {
        if (Array.isArray(value.richText)) return value.richText.map((part) => part.text || '').join('');
        if (value.text) return String(value.text);
        if (value.result != null) return cellText(value.result);
        if (value.hyperlink && value.text) return String(value.text);
    }
    return String(value);
}

function normalizeHeader(value) {
    return cellText(value)
        .toLowerCase()
        .replace(/\./g, '')
        .replace(/\s+/g, ' ')
        .trim();
}

function clean(value, field) {
    let text = cellText(value).replace(/\s+/g, ' ').trim();
    if (!text || text === '-' || text === '—') return null;
    const limit = LIMITS[field];
    if (limit && text.length > limit) text = text.slice(0, limit);
    return text;
}

function mapStatus(value) {
    const key = normalizeHeader(value);
    if (!key || key === '-' || key === '—') return { status: 'Active', fallback: false };
    if (key === 'active' || key === 'aktif') return { status: 'Active', fallback: false };
    if (key === 'inactive' || key === 'nonaktif' || key === 'non aktif') return { status: 'Inactive', fallback: false };
    if (key === 'suspended' || key === 'suspend') return { status: 'Suspended', fallback: false };
    return { status: 'Active', fallback: true };
}

function headerRow(sheet) {
    const last = Math.min(sheet.rowCount || 1, 8);
    for (let rowNumber = 1; rowNumber <= last; rowNumber += 1) {
        const fields = new Map();
        sheet.getRow(rowNumber).eachCell({ includeEmpty: false }, (cell, column) => {
            const field = COLUMN_MAP[normalizeHeader(cell.value)];
            if (field && !fields.has(field)) fields.set(field, column);
        });
        if (fields.has('no_jaringan') && fields.has('nama_pelanggan')) {
            return { rowNumber, fields };
        }
    }
    return null;
}

function findCustomerSheet(workbook) {
    const named = workbook.worksheets.find((sheet) => normalizeHeader(sheet.name) === 'data customer');
    if (named && headerRow(named)) return named;
    return workbook.worksheets.find((sheet) => headerRow(sheet)) || null;
}

async function loadWorkbook(source) {
    const workbook = new ExcelJS.Workbook();
    if (Buffer.isBuffer(source)) await workbook.xlsx.load(source);
    else await workbook.xlsx.readFile(source);
    return workbook;
}

function parseCustomerSheet(workbook) {
    const sheet = findCustomerSheet(workbook);
    if (!sheet) {
        const error = new Error('Sheet DATA CUSTOMER tidak ditemukan. Pastikan kolom No Jaringan dan Customer ada.');
        error.statusCode = 400;
        throw error;
    }

    const header = headerRow(sheet);
    const fields = [...header.fields.keys()];
    const byCustomer = new Map();
    let skipped = 0;
    let statusFallback = 0;
    let duplicateRows = 0;

    sheet.eachRow((row, rowNumber) => {
        if (rowNumber <= header.rowNumber) return;
        const read = (field) => {
            const column = header.fields.get(field);
            return column ? row.getCell(column).value : null;
        };
        const noJaringan = clean(read('no_jaringan'), 'no_jaringan');
        const nama = clean(read('nama_pelanggan'), 'nama_pelanggan');
        const hasAny = fields.some((field) => cellText(read(field)).trim());
        if (!hasAny) return;
        if (!noJaringan || !nama) {
            skipped += 1;
            return;
        }

        const record = { no_jaringan: noJaringan, nama_pelanggan: nama };
        fields.forEach((field) => {
            if (field === 'no_jaringan' || field === 'nama_pelanggan' || field === 'status') return;
            record[field] = clean(read(field), field);
        });
        if (fields.includes('status')) {
            const mapped = mapStatus(read('status'));
            record.status = mapped.status;
            if (mapped.fallback) statusFallback += 1;
        } else {
            record.status = 'Active';
        }
        const key = `${noJaringan}\u0000${nama}`;
        if (byCustomer.has(key)) duplicateRows += 1;
        byCustomer.set(key, record);
    });

    return {
        sheetName: sheet.name,
        columns: SHEET_COLUMNS,
        fields,
        rows: [...byCustomer.values()],
        skipped,
        statusFallback,
        duplicateRows
    };
}

async function summarizeWorkbook(filePath) {
    if (!fs.existsSync(filePath)) return null;
    const parsed = parseCustomerSheet(await loadWorkbook(filePath));
    return {
        fileName: path.basename(filePath),
        sheetName: parsed.sheetName,
        total: parsed.rows.length,
        skipped: parsed.skipped,
        columns: parsed.columns
    };
}

async function importCustomerRows(parsed) {
    if (!parsed.rows.length) {
        return {
            created: 0,
            updated: 0,
            total: 0,
            skipped: parsed.skipped,
            statusFallback: parsed.statusFallback,
            duplicateRows: parsed.duplicateRows,
            sheetName: parsed.sheetName
        };
    }

    const numbers = [...new Set(parsed.rows.map((row) => row.no_jaringan))];
    const existing = await Pelanggan.findAll({
        attributes: ['id', 'no_jaringan', 'nama_pelanggan'],
        where: { no_jaringan: { [Op.in]: numbers } }
    });
    const existingByCustomer = new Map(
        existing.map((row) => [`${row.no_jaringan}\u0000${row.nama_pelanggan}`, row.id])
    );
    const updatable = [...new Set([...parsed.fields, 'status'])].filter((field) => field !== 'no_jaringan' && field !== 'nama_pelanggan');
    const creating = [];
    const updating = [];
    parsed.rows.forEach((row) => {
        const id = existingByCustomer.get(`${row.no_jaringan}\u0000${row.nama_pelanggan}`);
        if (id) updating.push({ id, values: row });
        else creating.push(row);
    });

    if (creating.length) {
        await ensureSchema.dropNetworkNumberUnique(Pelanggan.sequelize);
        await Pelanggan.bulkCreate(creating);
    }
    for (const row of updating) {
        await Pelanggan.update(
            Object.fromEntries(updatable.map((field) => [field, row.values[field]])),
            { where: { id: row.id } }
        );
    }

    const updated = updating.length;
    return {
        created: creating.length,
        updated,
        total: parsed.rows.length,
        skipped: parsed.skipped,
        statusFallback: parsed.statusFallback,
        duplicateRows: parsed.duplicateRows,
        sheetName: parsed.sheetName
    };
}

async function importWorkbook(source) {
    const parsed = parseCustomerSheet(await loadWorkbook(source));
    return importCustomerRows(parsed);
}

function resultMessage(result) {
    const parts = [
        `Impor sheet ${result.sheetName} selesai: ${result.created} customer baru, ${result.updated} diperbarui`
    ];
    if (result.duplicateRows) parts.push(`${result.duplicateRows} baris dengan no jaringan dan customer yang sama memakai baris terakhir`);
    if (result.skipped) parts.push(`${result.skipped} baris dilewati karena No Jaringan atau Customer kosong`);
    if (result.statusFallback) parts.push(`${result.statusFallback} status tidak dikenal dan disimpan sebagai Active`);
    return parts.join('. ') + '.';
}

module.exports = {
    SHEET_COLUMNS,
    bundledWorkbookPath,
    summarizeWorkbook,
    importWorkbook,
    parseCustomerSheet,
    resultMessage
};
