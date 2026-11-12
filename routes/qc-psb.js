const express = require('express');
const router = express.Router();
const { Op } = require('sequelize');
const ExcelJS = require('exceljs');
const { QcPsb } = require('../models');
const { isEditor } = require('../middleware/auth');
const { paginate } = require('../utils/paginate');
const logActivity = require('../utils/activityLogger');

const STATUSES = ['Pending', 'Progress', 'Done'];
const SEARCH_FIELDS = ['notik', 'nojar', 'qc_ke', 'jenis', 'customer', 'akses', 'pj', 'keterangan'];

function payloadFrom(body) {
    const text = (value) => {
        const trimmed = String(value || '').trim();
        return trimmed || null;
    };
    return {
        tanggal: body.tanggal,
        notik: text(body.notik),
        nojar: text(body.nojar),
        qc_ke: text(body.qc_ke),
        jenis: text(body.jenis),
        customer: text(body.customer),
        akses: text(body.akses),
        pj: text(body.pj),
        status: text(body.status) || 'Pending',
        keterangan: text(body.keterangan)
    };
}

async function suggestions() {
    const rows = await QcPsb.findAll({
        attributes: ['qc_ke', 'jenis', 'akses', 'pj', 'status'],
        raw: true
    });
    const unique = (key, extras = []) => [...new Set([
        ...extras,
        ...rows.map((row) => row[key]).filter(Boolean)
    ])].sort((a, b) => String(a).localeCompare(String(b)));
    return {
        qcKe: unique('qc_ke'),
        jenis: unique('jenis'),
        akses: unique('akses', ['FO']),
        pj: unique('pj'),
        statuses: unique('status', STATUSES)
    };
}

router.get('/export', async (req, res) => {
    try {
        const { search, status } = req.query;
        const where = {};
        if (search) {
            where[Op.or] = SEARCH_FIELDS.map((field) => ({ [field]: { [Op.like]: `%${search}%` } }));
        }
        if (status) where.status = status;

        const data = await QcPsb.findAll({ where, order: [['tanggal', 'DESC'], ['id', 'DESC']] });
        const workbook = new ExcelJS.Workbook();
        const sheet = workbook.addWorksheet('QC PSB & PROJECT');
        sheet.columns = [
            { header: 'TANGGAL', key: 'tanggal', width: 16 },
            { header: 'NOTIK', key: 'notik', width: 18 },
            { header: 'NOJAR', key: 'nojar', width: 18 },
            { header: 'QC KE', key: 'qc_ke', width: 12 },
            { header: 'JENIS', key: 'jenis', width: 24 },
            { header: 'CUSTOMER', key: 'customer', width: 40 },
            { header: 'AKSES', key: 'akses', width: 14 },
            { header: 'PJ', key: 'pj', width: 16 },
            { header: 'STATUS', key: 'status', width: 14 },
            { header: 'KETERANGAN', key: 'keterangan', width: 60 }
        ];
        sheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
        sheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF2563EB' } };

        data.forEach((item) => {
            const [year, month, day] = String(item.tanggal || '').split('-');
            sheet.addRow({
                tanggal: day ? `${Number(day)}/${Number(month)}/${year}` : '',
                notik: item.notik || '',
                nojar: item.nojar || '',
                qc_ke: item.qc_ke || '',
                jenis: item.jenis || '',
                customer: item.customer || '',
                akses: item.akses || '',
                pj: item.pj || '',
                status: item.status || '',
                keterangan: item.keterangan || ''
            });
        });

        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', 'attachment; filename=QC_PSB_PROJECT.xlsx');
        await workbook.xlsx.write(res);
        res.end();
    } catch (error) {
        console.error('Export QC PSB Error:', error);
        req.flash('error_msg', 'Gagal export data');
        res.redirect('/qc-psb');
    }
});

router.get('/', async (req, res) => {
    try {
        const { search, status } = req.query;
        const where = {};
        if (search) {
            where[Op.or] = SEARCH_FIELDS.map((field) => ({ [field]: { [Op.like]: `%${search}%` } }));
        }
        if (status) where.status = status;
        const { rows, pagination } = await paginate(QcPsb, req, {
            where,
            order: [['tanggal', 'DESC'], ['id', 'DESC']]
        });
        const lists = await suggestions();
        res.render('qc-psb/index', {
            title: 'QC PSB & Project - SIMPELL',
            data: rows,
            pagination,
            search: search || '',
            status: status || '',
            statuses: lists.statuses
        });
    } catch (error) {
        console.error('QC PSB List Error:', error);
        req.flash('error_msg', 'Gagal memuat data QC PSB');
        res.redirect('/dashboard');
    }
});

router.get('/create', isEditor, async (req, res) => {
    const lists = await suggestions();
    res.render('qc-psb/form', {
        title: 'Tambah QC PSB & Project - SIMPELL',
        data: null,
        ...lists
    });
});

router.post('/', isEditor, async (req, res) => {
    try {
        const created = await QcPsb.create(payloadFrom(req.body));
        await logActivity(req, 'CREATE', `Menambah QC PSB: ${created.nojar || created.customer || created.id}`, 'qc_psb', created.id);
        req.flash('success_msg', 'Data QC PSB berhasil ditambahkan');
        res.redirect('/qc-psb');
    } catch (error) {
        console.error('Create QC PSB Error:', error);
        req.flash('error_msg', 'Gagal menambahkan data: ' + error.message);
        res.redirect('/qc-psb/create');
    }
});

router.get('/:id/edit', isEditor, async (req, res) => {
    const data = await QcPsb.findByPk(req.params.id);
    if (!data) {
        req.flash('error_msg', 'Data tidak ditemukan');
        return res.redirect('/qc-psb');
    }
    const lists = await suggestions();
    res.render('qc-psb/form', {
        title: 'Edit QC PSB & Project - SIMPELL',
        data,
        ...lists
    });
});

router.get('/:id', async (req, res) => {
    const data = await QcPsb.findByPk(req.params.id);
    if (!data) {
        req.flash('error_msg', 'Data tidak ditemukan');
        return res.redirect('/qc-psb');
    }
    res.render('qc-psb/detail', {
        title: 'Detail QC PSB & Project - SIMPELL',
        data
    });
});

router.put('/:id', isEditor, async (req, res) => {
    try {
        const data = await QcPsb.findByPk(req.params.id);
        if (!data) {
            req.flash('error_msg', 'Data tidak ditemukan');
            return res.redirect('/qc-psb');
        }
        await data.update(payloadFrom(req.body));
        await logActivity(req, 'UPDATE', `Mengubah QC PSB: ${data.nojar || data.customer || data.id}`, 'qc_psb', data.id);
        req.flash('success_msg', 'Data QC PSB berhasil diperbarui');
        res.redirect('/qc-psb');
    } catch (error) {
        console.error('Update QC PSB Error:', error);
        req.flash('error_msg', 'Gagal memperbarui data: ' + error.message);
        res.redirect(`/qc-psb/${req.params.id}/edit`);
    }
});

router.delete('/:id', isEditor, async (req, res) => {
    try {
        const data = await QcPsb.findByPk(req.params.id);
        if (data) {
            await logActivity(req, 'DELETE', `Menghapus QC PSB: ${data.nojar || data.customer || data.id}`, 'qc_psb', data.id);
            await data.destroy();
        }
        req.flash('success_msg', 'Data QC PSB berhasil dihapus');
    } catch (error) {
        req.flash('error_msg', 'Gagal menghapus data');
    }
    res.redirect('/qc-psb');
});

module.exports = router;
