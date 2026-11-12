const fs = require('fs');
const path = require('path');
const ExcelJS = require('exceljs');
const sequelize = require('../config/database');
const QcPsb = require('../models/QcPsb');

function cellText(value) {
    if (value == null) return '';
    if (value instanceof Date) {
        const y = value.getFullYear();
        const m = String(value.getMonth() + 1).padStart(2, '0');
        const d = String(value.getDate()).padStart(2, '0');
        return `${d}/${m}/${y}`;
    }
    if (typeof value === 'object') {
        if (Array.isArray(value.richText)) return value.richText.map((part) => part.text || '').join('');
        if (value.text) return String(value.text);
        if (value.result != null) return cellText(value.result);
    }
    return String(value);
}

function parseDate(value) {
    const text = cellText(value).trim();
    const match = text.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    if (!match) return null;
    return `${match[3]}-${match[2].padStart(2, '0')}-${match[1].padStart(2, '0')}`;
}

function blank(value) {
    const text = String(value || '').trim();
    return text || null;
}

function mapQcFields(ticketRaw, qcRaw, jenisRaw, detailRaw) {
    const ticket = String(ticketRaw || '').trim();
    const detail = String(detailRaw || '').trim();
    let nojar = '';
    let customer = detail;

    const leading = detail.match(/^(\d{6,})\s*[-–]?\s*([\s\S]*)$/);
    if (leading) {
        nojar = leading[1];
        customer = leading[2].trim();
    } else {
        const embedded = detail.match(/\d{8,}/);
        if (embedded) {
            nojar = embedded[0];
            customer = detail.replace(embedded[0], ' ').replace(/\s+/g, ' ').trim();
        } else if (/^\d{6,}$/.test(ticket)) {
            nojar = ticket;
        }
    }

    const jenis = String(jenisRaw || '').trim();
    const notik = ticket && !/^\d{6,}$/.test(ticket) && ticket.toUpperCase() !== jenis.toUpperCase()
        ? ticket
        : '';

    return {
        notik: blank(notik),
        nojar: blank(nojar),
        qc_ke: blank(qcRaw),
        jenis: blank(jenis),
        customer: blank(customer)
    };
}

async function columnNames() {
    const [cols] = await sequelize.query(
        `SELECT COLUMN_NAME AS name FROM INFORMATION_SCHEMA.COLUMNS
         WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'qc_psb'`
    );
    return new Set(cols.map((col) => col.name));
}

async function ensureQcColumns() {
    const names = await columnNames();
    if (!names.size) return names;
    const add = {
        notik: 'VARCHAR(100) NULL',
        nojar: 'VARCHAR(100) NULL',
        qc_ke: 'VARCHAR(50) NULL',
        jenis: 'VARCHAR(100) NULL'
    };
    for (const [column, definition] of Object.entries(add)) {
        if (!names.has(column)) {
            await sequelize.query(`ALTER TABLE qc_psb ADD COLUMN ${column} ${definition}`);
            names.add(column);
        }
    }
    await sequelize.query('ALTER TABLE qc_psb MODIFY COLUMN customer TEXT NULL');
    return names;
}

async function migrateLegacyRows(names) {
    if (!names.has('no_ticket') && !names.has('rincian')) return;
    const [rows] = await sequelize.query(
        'SELECT id, no_ticket, no_jaringan, customer, rincian FROM qc_psb'
    );
    for (const row of rows) {
        const mapped = mapQcFields(row.no_ticket, row.no_jaringan, row.customer, row.rincian);
        await sequelize.query(
            `UPDATE qc_psb
             SET notik = ?, nojar = ?, qc_ke = ?, jenis = ?, customer = ?
             WHERE id = ?`,
            { replacements: [mapped.notik, mapped.nojar, mapped.qc_ke, mapped.jenis, mapped.customer, row.id] }
        );
    }
    if (names.has('no_ticket')) await sequelize.query('ALTER TABLE qc_psb DROP COLUMN no_ticket');
    if (names.has('no_jaringan')) await sequelize.query('ALTER TABLE qc_psb DROP COLUMN no_jaringan');
    if (names.has('rincian')) await sequelize.query('ALTER TABLE qc_psb DROP COLUMN rincian');
}

async function importQcPsbIfEmpty() {
    const names = await ensureQcColumns();
    if (names.size) await migrateLegacyRows(names);

    const existing = await QcPsb.count();
    if (existing > 0) return 0;

    const filePath = path.join(__dirname, '..', 'SIMPELL.xlsx');
    if (!fs.existsSync(filePath)) return 0;

    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(filePath);
    const sheet = workbook.getWorksheet('QC PSB & PROJECT');
    if (!sheet) return 0;

    const rows = [];
    sheet.eachRow((row, rowNumber) => {
        if (rowNumber === 1) return;
        const tanggal = parseDate(row.getCell(1).value);
        if (!tanggal) return;
        const text = (column) => cellText(row.getCell(column).value).trim();
        rows.push({
            tanggal,
            ...mapQcFields(text(2), text(3), text(4), text(5)),
            akses: text(6) || null,
            pj: text(7) || null,
            status: text(8) || 'Pending',
            keterangan: text(9) || null
        });
    });

    if (rows.length) await QcPsb.bulkCreate(rows);
    return rows.length;
}

module.exports = importQcPsbIfEmpty;
module.exports.mapQcFields = mapQcFields;
