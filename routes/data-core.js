const express = require('express');
const router = express.Router();
const { DataCore, DataCoreSector } = require('../models');
const { Op } = require('sequelize');
const { isEditor } = require('../middleware/auth');
const ExcelJS = require('exceljs');
const { paginate } = require('../utils/paginate');

// GET - Export Excel
router.get('/export', async (req, res) => {
    try {
        const { search } = req.query;
        let where = {};
        if (search) {
            where = {
                [Op.or]: [
                    { no_jaringan: { [Op.like]: `%${search}%` } },
                    { nama_lokasi: { [Op.like]: `%${search}%` } }
                ]
            };
        }

        const data = await DataCore.findAll({
            where,
            include: [{ model: DataCoreSector, as: 'sectors', order: [['id', 'ASC']] }],
            order: [['createdAt', 'DESC']]
        });

        const workbook = new ExcelJS.Workbook();

        for (const item of data) {
            // Sanitize sheet name
            let sheetName = (item.nama_lokasi || 'Jaringan').replace(/[*?:\/[\]]/g, '').substring(0, 31);
            let counter = 1;
            while (workbook.getWorksheet(sheetName)) {
                sheetName = (item.nama_lokasi || 'Jaringan').substring(0, 28) + ` ${counter++}`;
            }

            const sheet = workbook.addWorksheet(sheetName);

            // Detailed Header Info
            sheet.mergeCells('A1:B1');
            sheet.getCell('A1').value = 'No Jaringan : ' + (item.no_jaringan || '-');
            sheet.getCell('A1').font = { bold: true, size: 12 };

            sheet.mergeCells('A2:B2');
            sheet.getCell('A2').value = 'Nama Lokasi : ' + (item.nama_lokasi || '-');
            sheet.getCell('A2').font = { bold: true, size: 12 };

            sheet.mergeCells('A3:D3'); // Spacer

            // Table Header
            sheet.getRow(4).values = ['No', 'Nama Sector', 'Koordinat', 'Keterangan'];
            sheet.columns = [
                { key: 'no', width: 5 },
                { key: 'nama_sector', width: 25 },
                { key: 'koordinat', width: 30 },
                { key: 'keterangan', width: 30 }
            ];

            // Header Style
            const headerRow = sheet.getRow(4);
            headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
            headerRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4B5563' } };

            if (item.sectors) {
                item.sectors.forEach((sector, index) => {
                    const row = sheet.addRow({
                        no: index + 1,
                        nama_sector: sector.nama_sector,
                        koordinat: (sector.latitude && sector.longitude) ? `${sector.latitude}, ${sector.longitude}` : '',
                        keterangan: sector.keterangan || ''
                    });

                    // Alternating Row Color
                    if ((index + 1) % 2 === 0) {
                        row.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF9FAFB' } }; // Light Gray
                    }
                });
            }
        }

        if (data.length === 0) {
            workbook.addWorksheet('No Data');
        }

        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', 'attachment; filename=Data_Core_Full_' + new Date().toISOString().slice(0, 10) + '.xlsx');

        await workbook.xlsx.write(res);
        res.end();

    } catch (error) {
        console.error('Export Error:', error);
        req.flash('error_msg', 'Gagal export data');
        res.redirect('/data-core');
    }
});

// GET - List all Jaringan
router.get('/', async (req, res) => {
    try {
        const { search } = req.query;
        let where = {};
        if (search) {
            where = {
                [Op.or]: [
                    { no_jaringan: { [Op.like]: `%${search}%` } },
                    { nama_lokasi: { [Op.like]: `%${search}%` } }
                ]
            };
        }

        const { rows, pagination } = await paginate(DataCore, req, {
            where,
            include: [{ model: DataCoreSector, as: 'sectors', separate: true }],
            order: [['createdAt', 'DESC']]
        });

        res.render('data-core/index', {
            title: 'Data Core - SIMPELL',
            data: rows,
            pagination,
            search: search || ''
        });
    } catch (error) {
        console.error('Error:', error);
        req.flash('error_msg', 'Gagal memuat data');
        res.redirect('/');
    }
});

// GET - Create jaringan form
router.get('/create', isEditor, (req, res) => {
    res.render('data-core/form', {
        title: 'Tambah Data Core - SIMPELL',
        data: null
    });
});

// POST - Create new jaringan
router.post('/', isEditor, async (req, res) => {
    try {
        await DataCore.create(req.body);
        req.flash('success_msg', 'Data berhasil ditambahkan');
        res.redirect('/data-core');
    }
    catch (error) {
        console.error('Error:', error);
        req.flash('error_msg', 'Gagal menambahkan data');
        res.redirect('/data-core/create');
    }
});

// GET - Jaringan detail with sectors
router.get('/:id', async (req, res) => {
    try {
        const data = await DataCore.findByPk(req.params.id, {
            include: [{ model: DataCoreSector, as: 'sectors', order: [['id', 'ASC']] }]
        });
        if (!data) {
            req.flash('error_msg', 'Data tidak ditemukan');
            return res.redirect('/data-core');
        }
        res.render('data-core/detail', {
            title: `${data.nama_lokasi} - Data Core`,
            data
        });
    } catch (error) {
        console.error('Error:', error);
        res.redirect('/data-core');
    }
});

// GET - Edit jaringan form
router.get('/:id/edit', isEditor, async (req, res) => {
    try {
        const { return_url } = req.query;
        const data = await DataCore.findByPk(req.params.id);
        if (!data) {
            req.flash('error_msg', 'Data tidak ditemukan');
            return res.redirect('/data-core');
        }
        res.render('data-core/form', {
            title: 'Edit Data Core - SIMPELL',
            data,
            return_url: return_url || '/data-core'
        });
    } catch (error) {
        res.redirect('/data-core');
    }
});

// PUT - Update jaringan
router.put('/:id', isEditor, async (req, res) => {
    try {
        const { return_url } = req.body;
        await DataCore.update(req.body, { where: { id: req.params.id } });
        req.flash('success_msg', 'Data berhasil diperbarui');
        res.redirect(return_url || '/data-core');
    }
    catch (error) {
        console.error('Error:', error);
        res.redirect(`/data-core/${req.params.id}/edit`);
    }
});

// DELETE - Delete jaringan and all its sectors
router.delete('/:id', isEditor, async (req, res) => {
    try {
        await DataCoreSector.destroy({ where: { data_core_id: req.params.id } });
        await DataCore.destroy({ where: { id: req.params.id } });
        req.flash('success_msg', 'Data berhasil dihapus');
    }
    catch (error) {
        req.flash('error_msg', 'Gagal menghapus');
    }
    res.redirect('/data-core');
});

// POST - Save waypoints for cable route
router.post('/:id/waypoints', isEditor, async (req, res) => {
    try {
        const { waypoints } = req.body;
        await DataCore.update(
            { waypoints: waypoints || [] },
            { where: { id: req.params.id } }
        );
        res.json({ success: true, message: 'Waypoints berhasil disimpan' });
    } catch (error) {
        console.error('Error saving waypoints:', error);
        res.status(500).json({ success: false, message: 'Gagal menyimpan waypoints' });
    }
});

// ========== SECTOR ROUTES ==========

// GET - Add sector form
router.get('/:id/sector/create', isEditor, async (req, res) => {
    try {
        const data = await DataCore.findByPk(req.params.id);
        if (!data) {
            req.flash('error_msg', 'Data tidak ditemukan');
            return res.redirect('/data-core');
        }
        res.render('data-core/sector-form', {
            title: 'Tambah Sector - Data Core',
            dataCore: data,
            sector: null
        });
    } catch (error) {
        res.redirect('/data-core');
    }
});

// POST - Create new sector
router.post('/:id/sector', isEditor, async (req, res) => {
    try {
        await DataCoreSector.create({
            data_core_id: req.params.id,
            nama_sector: req.body.nama_sector,
            latitude: req.body.latitude || null,
            longitude: req.body.longitude || null,
            keterangan: req.body.keterangan
        });
        req.flash('success_msg', 'Sector berhasil ditambahkan');
        res.redirect(`/data-core/${req.params.id}`);
    }
    catch (error) {
        console.error('Error:', error);
        req.flash('error_msg', 'Gagal menambahkan sector');
        res.redirect(`/data-core/${req.params.id}/sector/create`);
    }
});

// GET - Edit sector form
router.get('/:id/sector/:sectorId/edit', isEditor, async (req, res) => {
    try {
        const data = await DataCore.findByPk(req.params.id);
        const sector = await DataCoreSector.findByPk(req.params.sectorId);
        if (!data || !sector) {
            req.flash('error_msg', 'Data tidak ditemukan');
            return res.redirect('/data-core');
        }
        res.render('data-core/sector-form', {
            title: 'Edit Sector - Data Core',
            dataCore: data,
            sector
        });
    } catch (error) {
        res.redirect('/data-core');
    }
});

// PUT - Update sector
router.put('/:id/sector/:sectorId', isEditor, async (req, res) => {
    try {
        await DataCoreSector.update({
            nama_sector: req.body.nama_sector,
            latitude: req.body.latitude || null,
            longitude: req.body.longitude || null,
            keterangan: req.body.keterangan
        }, { where: { id: req.params.sectorId } });
        req.flash('success_msg', 'Sector berhasil diperbarui');
        res.redirect(`/data-core/${req.params.id}`);
    }
    catch (error) {
        console.error('Error:', error);
        res.redirect(`/data-core/${req.params.id}/sector/${req.params.sectorId}/edit`);
    }
});

// DELETE - Delete sector
router.delete('/:id/sector/:sectorId', isEditor, async (req, res) => {
    try {
        await DataCoreSector.destroy({ where: { id: req.params.sectorId } });
        req.flash('success_msg', 'Sector berhasil dihapus');
    }
    catch (error) {
        req.flash('error_msg', 'Gagal menghapus sector');
    }
    res.redirect(`/data-core/${req.params.id}`);
});

module.exports = router;
