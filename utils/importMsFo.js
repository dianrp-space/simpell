const fs = require('fs');
const path = require('path');
const ExcelJS = require('exceljs');
const MsFo = require('../models/MsFo');
const PendingMsFo = require('../models/PendingMsFo');
const PmMsFo = require('../models/PmMsFo');
const { cellText, cleanText, cleanNumber, parseDisplayDate } = require('./sheetValue');

function workbookPath() {
    return path.join(__dirname, '..', 'SIMPELL.xlsx');
}

function textAt(row, column, max) {
    return cleanText(row.getCell(column).value, max);
}

function parsePmBlock(title) {
    const match = String(title).match(/^(.*?)\s*[-–]\s*(.*?)\s*\[\s*Target\s*(\d+)\s*\]\s*$/i);
    if (!match) {
        return { judul: title, jenis: title, periode: null, target: null };
    }
    return {
        judul: title,
        jenis: match[1].trim(),
        periode: match[2].trim(),
        target: Number(match[3])
    };
}

function readPmSheet(sheet) {
    const rows = [];
    if (!sheet) return rows;
    let block = null;
    sheet.eachRow((row) => {
        const label = cellText(row.getCell(2).value).replace(/\s+/g, ' ').trim();
        if (!label) return;
        if (/^no\.?$/i.test(label)) return;
        if (!/^\d+$/.test(label)) {
            block = parsePmBlock(label);
            return;
        }
        if (!block) return;
        rows.push({
            urutan: rows.length + 1,
            judul: block.judul,
            jenis: block.jenis,
            periode: block.periode,
            target: block.target,
            nomor: Number(label),
            tanggal: parseDisplayDate(row.getCell(3).value),
            no_ticket: textAt(row, 4, 100),
            no_jaringan: textAt(row, 5, 100),
            customer: textAt(row, 6, 255),
            rincian: textAt(row, 7)
        });
    });
    return rows;
}

async function readWorkbook(filePath = workbookPath()) {
    if (!fs.existsSync(filePath)) return { msFo: [], pending: [], pm: [] };
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

    return { msFo, pending, pm: readPmSheet(workbook.getWorksheet('DATA PM MS FO KEPRI')) };
}

async function importMsFoIfEmpty() {
    const [msCount, pendingCount, pmCount] = await Promise.all([
        MsFo.count(),
        PendingMsFo.count(),
        PmMsFo.count()
    ]);
    if (msCount > 0 && pendingCount > 0 && pmCount > 0) return { msFo: 0, pending: 0, pm: 0 };

    const data = await readWorkbook();
    const inserted = { msFo: 0, pending: 0, pm: 0 };
    if (msCount === 0 && data.msFo.length) {
        await MsFo.bulkCreate(data.msFo);
        inserted.msFo = data.msFo.length;
    }
    if (pendingCount === 0 && data.pending.length) {
        await PendingMsFo.bulkCreate(data.pending);
        inserted.pending = data.pending.length;
    }
    if (pmCount === 0 && data.pm.length) {
        await PmMsFo.bulkCreate(data.pm);
        inserted.pm = data.pm.length;
    }
    return inserted;
}

module.exports = importMsFoIfEmpty;
module.exports.readWorkbook = readWorkbook;
