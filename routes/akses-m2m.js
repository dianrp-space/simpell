const express = require('express');
const router = express.Router();
const { AksesM2m, Pelanggan } = require('../models');
const { Op } = require('sequelize');
const { isEditor } = require('../middleware/auth');
const ExcelJS = require('exceljs');
const { paginate } = require('../utils/paginate');

router.use((req, res, next) => {
    const soltem = req.baseUrl === '/akses-soltem';
    req.m2mLayanan = soltem ? 'SOLTEM' : 'M2M';
    req.m2mBase = soltem ? '/akses-soltem' : '/akses-m2m';
    res.locals.m2mLayanan = req.m2mLayanan;
    res.locals.m2mBase = req.m2mBase;
    res.locals.m2mTitle = soltem ? 'Soltemp' : 'Backup M2M';
    next();
});

function baseOf(req) {
    return req.m2mBase || '/akses-m2m';
}

function baseForLayanan(layanan) {
    if (layanan === 'SOLTEM' || layanan === 'SOLTEMP') return '/akses-soltem';
    return '/akses-m2m';
}

function layananWhere(req) {
    if (req.m2mLayanan === 'SOLTEM') {
        return { layanan: { [Op.in]: ['SOLTEM', 'SOLTEMP'] } };
    }
    return {
        [Op.or]: [
            { layanan: 'M2M' },
            { layanan: null },
            { layanan: '' }
        ]
    };
}

function normalizeLayanan(req) {
    let layanan = req.body.layanan;
    if (layanan === 'SOLTEMP') layanan = 'SOLTEM';
    if (!layanan) layanan = req.m2mLayanan || 'M2M';
    return layanan;
}

function relocateIfOtherLayanan(req, res, layanan) {
    const expected = baseForLayanan(layanan);
    if (req.baseUrl === expected) return false;
    res.redirect(expected + req.url);
    return true;
}

// GET - Export Excel (Must be before dynamic /:id route)
router.get('/export', async (req, res) => {
    try {
        const { search } = req.query;
        const where = search ? {
            [Op.and]: [
                layananWhere(req),
                {
                    [Op.or]: [
                        { '$pelanggan.nama_pelanggan$': { [Op.like]: `%${search}%` } },
                        { '$pelanggan.no_jaringan$': { [Op.like]: `%${search}%` } },
                        { no_gsm: { [Op.like]: `%${search}%` } }
                    ]
                }
            ]
        } : layananWhere(req);

        const data = await AksesM2m.findAll({
            where,
            include: [{ model: Pelanggan, as: 'pelanggan' }],
            order: [['created_at', 'DESC']]
        });

        const workbook = new ExcelJS.Workbook();
        const sheet = workbook.addWorksheet('Data M2M');

        // Table Header
        sheet.getRow(1).values = [
            'No', 'No Jaringan', 'Customer', 'Koordinat', 'VLAN', 'IP Secondary',
            'Detail', 'Layanan', 'No GSM', 'Kuota', 'Slot SIM', 'Keterangan'
        ];

        sheet.columns = [
            { key: 'no', width: 5 },
            { key: 'no_jaringan', width: 20 },
            { key: 'customer', width: 30 },
            { key: 'koordinat', width: 25 },
            { key: 'vlan', width: 15 },
            { key: 'ip_secondary', width: 20 },
            { key: 'detail', width: 30 },
            { key: 'layanan', width: 15 },
            { key: 'no_gsm', width: 20 },
            { key: 'kuota', width: 15 },
            { key: 'slot_sim', width: 15 },
            { key: 'keterangan', width: 30 }
        ];

        // Header Style
        const headerRow = sheet.getRow(1);
        headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
        headerRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4B5563' } };

        data.forEach((item, index) => {
            const row = sheet.addRow({
                no: index + 1,
                no_jaringan: item.pelanggan ? item.pelanggan.no_jaringan : '-',
                customer: item.pelanggan ? item.pelanggan.nama_pelanggan : '-',
                koordinat: (item.latitude && item.longitude) ? `${item.latitude}, ${item.longitude}` : '-',
                vlan: item.vlan || '',
                ip_secondary: item.ip_secondary || '',
                detail: item.detail || '',
                layanan: item.layanan || '',
                no_gsm: item.no_gsm || '',
                kuota: item.kuota || '',
                slot_sim: item.slot_sim || '',
                keterangan: item.keterangan || ''
            });

            // Alternating Row Color
            if ((index + 1) % 2 === 0) {
                row.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF9FAFB' } };
            }
        });

        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', 'attachment; filename=M2M_Full_' + new Date().toISOString().slice(0, 10) + '.xlsx');

        await workbook.xlsx.write(res);
        res.end();

    } catch (error) {
        console.error('Export Error:', error);
        req.flash('error_msg', 'Gagal export data');
        res.redirect(baseOf(req));
    }
});

router.get('/', async (req, res) => {
    try {
        const { search } = req.query;
        const where = search ? {
            [Op.and]: [
                layananWhere(req),
                {
                    [Op.or]: [
                        { '$pelanggan.nama_pelanggan$': { [Op.like]: `%${search}%` } },
                        { '$pelanggan.no_jaringan$': { [Op.like]: `%${search}%` } }
                    ]
                }
            ]
        } : layananWhere(req);
        const { rows, pagination } = await paginate(AksesM2m, req, {
            where,
            include: [{ model: Pelanggan, as: 'pelanggan' }],
            order: [['created_at', 'DESC']],
            subQuery: false
        });
        res.render('akses-m2m/index', { title: `${req.m2mLayanan} - SIMPELL`, data: rows, pagination, search: search || '' });
    } catch (error) {
        console.error(error);
        req.flash('error_msg', 'Gagal memuat data');
        res.redirect('/');
    }
});

router.get('/create', isEditor, async (req, res) => {
    const pelangganList = await Pelanggan.findAll({
        attributes: ['id', 'no_jaringan', 'nama_pelanggan'],
        order: [['nama_pelanggan', 'ASC']]
    });
    res.render('akses-m2m/form', {
        title: `Tambah ${req.m2mLayanan} - SIMPELL`,
        data: null,
        pelangganList
    });
});

router.post('/', isEditor, async (req, res) => {
    try {
        const payload = { ...req.body, layanan: normalizeLayanan(req) };

        await AksesM2m.create(payload);
        req.flash('success_msg', 'Data berhasil ditambahkan');
        res.redirect(baseForLayanan(payload.layanan));
    } catch (error) {
        console.error('Error creating M2M:', error);
        req.flash('error_msg', 'Gagal menambahkan data');
        res.redirect(baseOf(req) + '/create');
    }
});

router.get('/:id/edit', isEditor, async (req, res) => {
    try {
        const data = await AksesM2m.findByPk(req.params.id, {
            include: [{ model: Pelanggan, as: 'pelanggan' }]
        });
        if (!data) { req.flash('error_msg', 'Data tidak ditemukan'); return res.redirect(baseOf(req)); }
        if (relocateIfOtherLayanan(req, res, data.layanan)) return;

        const pelangganList = await Pelanggan.findAll({
            attributes: ['id', 'no_jaringan', 'nama_pelanggan'],
            order: [['nama_pelanggan', 'ASC']]
        });

        res.render('akses-m2m/form', {
            title: `Edit ${req.m2mLayanan} - SIMPELL`,
            data,
            pelangganList,
            returnUrl: req.query.return_url
        });
    } catch (error) { res.redirect(baseOf(req)); }
});

router.put('/:id', isEditor, async (req, res) => {
    try {
        const payload = { ...req.body, layanan: normalizeLayanan(req) };
        await AksesM2m.update(payload, { where: { id: req.params.id } });

        req.flash('success_msg', 'Data berhasil diperbarui');
        if (req.query.return_url) {
            return res.redirect(req.query.return_url);
        }
        res.redirect(baseForLayanan(payload.layanan));

    } catch (error) {
        console.error('Error updating M2M:', error);
        res.redirect(baseOf(req) + '/' + req.params.id + '/edit');
    }
});

router.get('/:id', async (req, res) => {
    try {
        const data = await AksesM2m.findByPk(req.params.id, {
            include: [{ model: Pelanggan, as: 'pelanggan' }]
        });
        if (!data) { req.flash('error_msg', 'Data tidak ditemukan'); return res.redirect(baseOf(req)); }
        if (relocateIfOtherLayanan(req, res, data.layanan)) return;

        const pelangganList = await Pelanggan.findAll({
            attributes: ['id', 'no_jaringan', 'nama_pelanggan'],
            order: [['nama_pelanggan', 'ASC']]
        });

        res.render('akses-m2m/detail', {
            title: `Detail ${req.m2mLayanan} - SIMPELL`,
            data,
            pelangganList,
            readonly: true
        });
    } catch (error) { res.redirect(baseOf(req)); }
});

router.delete('/:id', isEditor, async (req, res) => {
    try {
        await AksesM2m.destroy({ where: { id: req.params.id } });
        req.flash('success_msg', 'Data berhasil dihapus');
        if (req.query.return_url) {
            return res.redirect(req.query.return_url);
        }
    }
    catch (error) { req.flash('error_msg', 'Gagal menghapus'); }
    res.redirect(baseOf(req));
});

module.exports = router;
