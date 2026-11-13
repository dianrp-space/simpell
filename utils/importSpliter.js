const fs = require('fs');
const path = require('path');
const ExcelJS = require('exceljs');
const DataSpliter = require('../models/DataSpliter');
const { cellText } = require('./sheetValue');
const { warnaFromFill } = require('./fiberColors');

function workbookPath() {
    return path.join(__dirname, '..', 'SIMPELL.xlsx');
}

function norm(value) {
    return cellText(value).replace(/\u00a0/g, ' ').replace(/\s+/g, ' ').trim();
}

function masterOf(merges, row, col) {
    return merges.get(`${row}:${col}`) || { top: row, left: col, bottom: row, right: col };
}

function textAt(sheet, merges, row, col) {
    const info = masterOf(merges, row, col);
    return norm(sheet.getRow(info.top).getCell(info.left).value);
}

function columnOwns(merges, row, col) {
    return masterOf(merges, row, col).left === col;
}

function sameMaster(merges, row, leftCol, rightCol) {
    const left = masterOf(merges, row, leftCol);
    const right = masterOf(merges, row, rightCol);
    return left.top === right.top && left.left === right.left && left.right > left.left;
}

function buildMerges(sheet) {
    const merges = new Map();
    Object.values(sheet._merges || {}).forEach((merge) => {
        const model = merge.model || merge;
        for (let row = model.top; row <= model.bottom; row += 1) {
            for (let col = model.left; col <= model.right; col += 1) {
                merges.set(`${row}:${col}`, model);
            }
        }
    });
    return merges;
}

function readSpliterSheet(sheet) {
    const rows = [];
    if (!sheet) return rows;
    const merges = buildMerges(sheet);
    let lokasi = null;
    let kartu = null;

    for (let row = 1; row <= sheet.rowCount; row += 1) {
        const vals = [1, 2, 3, 4, 5, 6, 7, 8, 9].map((col) => textAt(sheet, merges, row, col));
        if (!vals.some(Boolean)) continue;
        const sameRow = vals.every((value) => value === vals[0]);
        if (/^olt$/i.test(vals[0]) && /^tray$/i.test(vals[1])) continue;
        if (sameRow && /^data\s+split/i.test(vals[0])) continue;
        if (sameRow && /card/i.test(vals[0])) {
            kartu = vals[0];
            continue;
        }
        if (sameRow && vals[0] && !/^olt\b/i.test(vals[0]) && !/^\[/.test(vals[0])) {
            lokasi = vals[0];
            kartu = null;
            continue;
        }

        const owns = (col) => columnOwns(merges, row, col);
        let noSpliter = owns(4) ? vals[3] || null : null;
        let deskripsi = owns(6) ? vals[5] || null : null;
        let port = null;
        if (sameMaster(merges, row, 4, 6)) {
            const shared = vals[3] || null;
            if (shared && /split|spliit/i.test(shared)) noSpliter = shared;
            else {
                noSpliter = null;
                deskripsi = shared;
            }
        } else if (owns(5) && /^\d{1,2}$/.test(vals[4])) {
            port = Number(vals[4]);
        }

        const record = {
            urutan: rows.length + 1,
            lokasi,
            kartu,
            olt: owns(1) ? vals[0] || null : null,
            tray: owns(2) ? vals[1] || null : null,
            core: owns(3) ? vals[2] || null : null,
            no_spliter: noSpliter,
            port,
            warna: port ? warnaFromFill(sheet.getRow(row).getCell(5).fill && sheet.getRow(row).getCell(5).fill.fgColor, port) : null,
            deskripsi,
            destination: owns(7) ? vals[6] || null : null,
            template: owns(8) ? vals[7] || null : null,
            keterangan: owns(9) ? vals[8] || null : null
        };

        const legend = !record.olt && !record.tray && !record.core && !record.no_spliter
            && !record.port && !record.destination && !record.template && !record.keterangan
            && record.deskripsi && /^template\s*:/i.test(record.deskripsi);
        const empty = !record.olt && !record.tray && !record.core && !record.no_spliter
            && !record.port && !record.deskripsi && !record.destination && !record.template && !record.keterangan;
        if (legend || empty) continue;
        rows.push(record);
        record.urutan = rows.length;
    }
    return rows;
}

async function readWorkbook(filePath = workbookPath()) {
    if (!fs.existsSync(filePath)) return [];
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(filePath);
    return readSpliterSheet(workbook.getWorksheet('DATA SPLITTER'));
}

async function importSpliterIfEmpty() {
    const count = await DataSpliter.count();
    if (count > 0) return 0;
    const rows = await readWorkbook();
    if (!rows.length) return 0;
    await DataSpliter.bulkCreate(rows);
    return rows.length;
}

module.exports = importSpliterIfEmpty;
module.exports.readWorkbook = readWorkbook;
module.exports.readSpliterSheet = readSpliterSheet;
