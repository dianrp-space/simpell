const express = require('express');
const router = express.Router();
const Cpe = require('../models/Cpe');
const Pelanggan = require('../models/Pelanggan');
const { Op } = require('sequelize');
const ExcelJS = require('exceljs');
const { paginate } = require('../utils/paginate');

// GET - Export Excel (Must be before dynamic /:id route)
router.get('/export', async (req, res) => {
    try {
        const { search } = req.query;
        let where = {};
        if (search) {
            where = {
                [Op.or]: [
                    { '$pelanggan.no_jaringan$': { [Op.like]: `%${search}%` } },
                    { '$pelanggan.nama_pelanggan$': { [Op.like]: `%${search}%` } }
                ]
            };
        }

        const data = await Cpe.findAll({
            where,
            include: [{ model: Pelanggan, as: 'pelanggan' }],
            order: [['updatedAt', 'DESC']]
        });

        const workbook = new ExcelJS.Workbook();
        const sheet = workbook.addWorksheet('Data CPE');

        // Table Header
        sheet.getRow(1).values = [
            'No', 'No Jaringan', 'Customer', 'SN Perangkat', 'Mac Address', 'IP WAN', 'Keterangan'
        ];

        sheet.columns = [
            { key: 'no', width: 5 },
            { key: 'no_jaringan', width: 20 },
            { key: 'customer', width: 30 },
            { key: 'sn_perangkat', width: 20 },
            { key: 'mac_address', width: 20 },
            { key: 'ip_wan', width: 20 },
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
                sn_perangkat: item.sn_perangkat || '',
                mac_address: item.mac_address || '',
                ip_wan: item.ip_wan || '',
                keterangan: item.keterangan || ''
            });

            // Alternating Row Color
            if ((index + 1) % 2 === 0) {
                row.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF9FAFB' } };
            }
        });

        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', 'attachment; filename=CPE_Full_' + new Date().toISOString().slice(0, 10) + '.xlsx');

        await workbook.xlsx.write(res);
        res.end();

    } catch (error) {
        console.error('Export Error:', error);
        req.flash('error_msg', 'Gagal export data');
        res.redirect('/cpe');
    }
});

// GET /cpe (List)
router.get('/', async (req, res) => {
    try {
        const { search } = req.query;

        let where = {};
        if (search) {
            where = {
                [Op.or]: [
                    { '$pelanggan.no_jaringan$': { [Op.like]: `%${search}%` } },
                    { '$pelanggan.nama_pelanggan$': { [Op.like]: `%${search}%` } }
                ]
            };
        }

        const { rows, pagination } = await paginate(Cpe, req, {
            include: [{ model: Pelanggan, as: 'pelanggan' }],
            where,
            subQuery: false,
            order: [['updatedAt', 'DESC']]
        });

        res.render('cpe/index', {
            title: 'Data CPE - SIMPELL',
            data: rows,
            pagination,
            totalItems: pagination.total,
            search: search || ''
        });
    } catch (error) {
        console.error(error);
        req.flash('error_msg', 'Terjadi kesalahan server');
        res.redirect('/');
    }
});

// GET /cpe/create (Form)
router.get('/create', async (req, res) => {
    try {
        const pelangganList = await Pelanggan.findAll({
            attributes: ['id', 'no_jaringan', 'nama_pelanggan'],
            where: { status: 'Active' },
            order: [['nama_pelanggan', 'ASC']]
        });

        res.render('cpe/form', {
            title: 'Tambah CPE - SIMPELL',
            data: null,
            pelangganList,
            pelangganList
        });
    } catch (error) {
        console.error(error);
        req.flash('error_msg', 'Gagal memuat form');
        res.redirect('/cpe');
    }
});

// POST /cpe (Store)
router.post('/', async (req, res) => {
    try {
        await Cpe.create(req.body);
        req.flash('success_msg', 'Data CPE berhasil ditambahkan');
        res.redirect('/cpe');
    } catch (error) {
        console.error(error);
        req.flash('error_msg', 'Gagal menambah data');
        res.redirect('/cpe/create');
    }
});

// GET /cpe/:id/edit (Edit Form)
router.get('/:id/edit', async (req, res) => {
    try {
        const data = await Cpe.findByPk(req.params.id, {
            include: [{ model: Pelanggan, as: 'pelanggan' }]
        });

        if (!data) {
            req.flash('error_msg', 'Data tidak ditemukan');
            return res.redirect('/cpe');
        }

        const pelangganList = await Pelanggan.findAll({
            attributes: ['id', 'no_jaringan', 'nama_pelanggan'],
            where: { status: 'Active' },
            order: [['nama_pelanggan', 'ASC']]
        });

        res.render('cpe/form', {
            title: 'Edit CPE - SIMPELL',
            data,
            pelangganList,
            returnUrl: req.query.return_url
        });
    } catch (error) {
        console.error(error);
        req.flash('error_msg', 'Terjadi kesalahan server');
        res.redirect('/cpe');
    }
});

// PUT /cpe/:id (Update)
router.put('/:id', async (req, res) => {
    try {
        const data = await Cpe.findByPk(req.params.id);
        if (!data) {
            req.flash('error_msg', 'Data tidak ditemukan');
            return res.redirect('/cpe');
        }

        await data.update(req.body);
        await data.update(req.body);
        req.flash('success_msg', 'Data CPE berhasil diperbarui');
        if (req.query.return_url) {
            return res.redirect(req.query.return_url);
        }
        res.redirect('/cpe');
    } catch (error) {
        console.error(error);
        req.flash('error_msg', 'Gagal memperbarui data');
        res.redirect(`/cpe/${req.params.id}/edit`);
    }
});

// GET /cpe/:id (Detail)
router.get('/:id', async (req, res) => {
    try {
        const data = await Cpe.findByPk(req.params.id, {
            include: [{ model: Pelanggan, as: 'pelanggan' }]
        });
        if (!data) { req.flash('error_msg', 'Data tidak ditemukan'); return res.redirect('/cpe'); }

        const pelangganList = await Pelanggan.findAll({
            attributes: ['id', 'no_jaringan', 'nama_pelanggan'],
            where: { status: 'Active' },
            order: [['nama_pelanggan', 'ASC']]
        });

        res.render('cpe/detail', {
            title: 'Detail CPE - SIMPELL',
            data,
            pelangganList,
            readonly: true
        });
    } catch (error) { res.redirect('/cpe'); }
});

// DELETE /cpe/:id (Destroy)
router.delete('/:id', async (req, res) => {
    try {
        const data = await Cpe.findByPk(req.params.id);
        if (data) {
            await data.destroy();
            req.flash('success_msg', 'Data CPE berhasil dihapus');
        } else {
            req.flash('error_msg', 'Data tidak ditemukan');
        }
        if (req.query.return_url) {
            return res.redirect(req.query.return_url);
        }
        res.redirect('/cpe');
    } catch (error) {
        console.error(error);
        req.flash('error_msg', 'Gagal menghapus data');
        res.redirect('/cpe');
    }
});

module.exports = router;
