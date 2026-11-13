const fs = require('fs');
const path = require('path');
const ExcelJS = require('exceljs');
const MsFo = require('../models/MsFo');
const PendingMsFo = require('../models/PendingMsFo');
const { cellText, cleanText, cleanNumber, parseDisplayDate } = require('./sheetValue');

function workbookPath() {
    return path.join(__dirname, '..', 'SIMPELL.xlsx');
}

function textAt(row, column, max) {
    return cleanText(row.getCell(column).value, max);
}

async function readWorkbook(filePath = workbookPath()) {
    if (!fs.existsSync(filePath)) return { msFo: [], pending: [] };
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(filePath);

    const msSheet = workbook.getWorksheet('DATA MS FO KEPRI');
    const msFo = [];
    if (msSheet) {
        msSheet.eachRow((row, rowNumber) => {
            if (rowNumber === 1) return;
            const noJaringan = textAt(row, 2, 100);
            const customer = textAt(row, 3, 255);
            if (!noJaringan && !customer && !cellText(row.getCell(1).value).trim()) return;
            msFo.push({
                nomor: cleanNumber(row.getCell(1).value),
                no_jaringan: noJaringan,
                customer,
                service: textAt(row, 4, 100),
                bandwidth: textAt(row, 5, 50),
                akses: textAt(row, 6, 100),
                node: textAt(row, 7, 100),
                status: textAt(row, 8, 50) || 'Active',
                kota: textAt(row, 9, 100),
                lat_long: textAt(row, 10, 255),
                pj: textAt(row, 11, 100),
                keterangan: textAt(row, 12)
            });
        });
    }

    const pendingSheet = workbook.getWorksheet('PENDINGAN MS FO KEPRI');
    const pending = [];
    if (pendingSheet) {
        pendingSheet.eachRow((row, rowNumber) => {
            if (rowNumber === 1) return;
            const tanggal = parseDisplayDate(row.getCell(1).value);
            if (!tanggal) return;
            pending.push({
                tanggal,
                no_ticket: textAt(row, 2, 100),
                no_jaringan: textAt(row, 3, 100),
                customer: textAt(row, 4, 255),
                rincian: textAt(row, 5),
                akses: textAt(row, 6, 100),
                pj: textAt(row, 7, 100),
                status: textAt(row, 8, 50) || 'Pending',
                keterangan: textAt(row, 9)
            });
        });
    }

    return { msFo, pending };
}

async function importMsFoIfEmpty() {
    const [msCount, pendingCount] = await Promise.all([
        MsFo.count(),
        PendingMsFo.count()
    ]);
    if (msCount > 0 && pendingCount > 0) return { msFo: 0, pending: 0 };

    const data = await readWorkbook();
    const inserted = { msFo: 0, pending: 0 };
    if (msCount === 0 && data.msFo.length) {
        await MsFo.bulkCreate(data.msFo);
        inserted.msFo = data.msFo.length;
    }
    if (pendingCount === 0 && data.pending.length) {
        await PendingMsFo.bulkCreate(data.pending);
        inserted.pending = data.pending.length;
    }
    return inserted;
}

module.exports = importMsFoIfEmpty;
module.exports.readWorkbook = readWorkbook;
