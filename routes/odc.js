const express = require('express');
const router = express.Router();
const { Odc, OdcCore } = require('../models');
const { Op } = require('sequelize');
const logActivity = require('../utils/activityLogger');
const { paginate } = require('../utils/paginate');
const { isEditor } = require('../middleware/auth');

const CORE_COLORS = ['Blue', 'Orange', 'Green', 'Brown', 'Gray', 'White', 'Red', 'Black', 'Yellow', 'Purple', 'Pink', 'Aqua'];
const STATUSES = ['Active', 'Cut', 'Alokasi', 'Idle', 'None', 'Bad'];
const COLOR_HEX = {
    'Blue': '#0000FF', 'Orange': '#FF8C00', 'Green': '#008000', 'Brown': '#8B4513',
    'Gray': '#808080', 'White': '#FFFFFF', 'Red': '#FF0000', 'Black': '#000000',
    'Yellow': '#FFD700', 'Purple': '#800080', 'Pink': '#FF69B4', 'Aqua': '#00FFFF'
};

const ExcelJS = require('exceljs');

// GET - Export Excel
router.get('/export', async (req, res) => {
    try {
        const { search } = req.query;
        let where = {};
        if (search) {
            where = { nama_odc: { [Op.like]: `%${search}%` } };
        }

        const odcs = await Odc.findAll({
            where,
            order: [['created_at', 'DESC']],
            include: [{ model: OdcCore, as: 'cores', order: [['sector', 'ASC'], ['tray', 'ASC'], ['tube', 'ASC'], ['core_number', 'ASC']] }]
        });

        const workbook = new ExcelJS.Workbook();

        for (const item of odcs) {
            // Sanitize sheet name
            let sheetName = item.nama_odc.replace(/[*?:\/[\]]/g, '').substring(0, 31);
            let counter = 1;
            while (workbook.getWorksheet(sheetName)) {
                sheetName = item.nama_odc.substring(0, 28) + ` ${counter++}`;
            }

            const sheet = workbook.addWorksheet(sheetName);

            sheet.columns = [
                { header: 'Sector', key: 'sector', width: 10 },
                { header: 'Tray', key: 'tray', width: 8 },
                { header: 'Tube', key: 'tube', width: 8 },
                { header: 'Warna Tube', key: 'tube_color', width: 15 },
                { header: 'Core', key: 'core_number', width: 8 },
                { header: 'Warna Core', key: 'core_color', width: 15 },
                { header: 'Status', key: 'status', width: 10 },
                { header: 'Deskripsi Core', key: 'description_core', width: 25 },
                { header: 'Destination', key: 'destination', width: 20 },
                { header: 'Customer', key: 'customer', width: 20 },
                { header: 'Keterangan', key: 'description', width: 25 }
            ];

            // Header style
            sheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
            sheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4B5563' } };

            if (item.cores) {
                let lastSector = null;
                let sectorColorState = 0;
                const sectorColors = ['FFD1FAE5', 'FFECFDF5']; // Green-100, Green-50

                let lastTray = null;
                let trayColorState = 0;
                const trayColors = ['FFDBEAFE', 'FFEFF6FF']; // Blue-100, Blue-50

                item.cores.forEach(core => {
                    // Skip placeholders if desired, strictly user said "data lengkap".
                    // If tray=0 or tube=0, skip.
                    if (core.tube === 0 || core.core_number === 0) return;

                    // Grouping Logic
                    if (core.sector !== lastSector) {
                        sectorColorState = 1 - sectorColorState;
                        lastSector = core.sector;
                        lastTray = null; // Reset tray tracking on sector change
                    }
                    if (core.tray !== lastTray) {
                        trayColorState = 1 - trayColorState;
                        lastTray = core.tray;
                    }

                    const row = sheet.addRow({
                        sector: core.sector,
                        tray: core.tray,
                        tube: core.tube,
                        tube_color: core.tube_color,
                        core_number: core.core_number,
                        core_color: core.core_color,
                        status: core.status,
                        description_core: core.description_core || '',
                        destination: core.destination || '',
                        customer: core.customer || '',
                        description: core.description || ''
                    });

                    // Styling Group Columns
                    try {
                        const sectorCell = row.getCell('sector');
                        sectorCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: sectorColors[sectorColorState] } };
                        sectorCell.font = { color: { argb: 'FF000000' } }; // Force black text

                        const trayCell = row.getCell('tray');
                        trayCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: trayColors[trayColorState] } };
                        trayCell.font = { color: { argb: 'FF000000' } }; // Force black text
                    } catch (e) { console.error('Styling error:', e); }

                    // Styling
                    const applyColor = (key, colorName) => {
                        if (COLOR_HEX[colorName]) {
                            const argb = 'FF' + COLOR_HEX[colorName].substring(1);
                            const cell = row.getCell(key);
                            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb } };

                            // Contrast text
                            const darkColors = ['Blue', 'Green', 'Brown', 'Red', 'Black', 'Purple'];
                            cell.font = { color: { argb: darkColors.includes(colorName) ? 'FFFFFFFF' : 'FF000000' } };

                            // Border for White
                            if (colorName === 'White') {
                                cell.border = {
                                    top: { style: 'thin', color: { argb: 'FFD1D5DB' } },
                                    left: { style: 'thin', color: { argb: 'FFD1D5DB' } },
                                    bottom: { style: 'thin', color: { argb: 'FFD1D5DB' } },
                                    right: { style: 'thin', color: { argb: 'FFD1D5DB' } }
                                };
                            }
                        }
                    };

                    applyColor('tube_color', core.tube_color);
                    applyColor('core_color', core.core_color);
                    applyColor('tube', core.tube_color); // Color tube number too
                    applyColor('core_number', core.core_color); // Color core number too
                });
            }
        }

        if (odcs.length === 0) {
            workbook.addWorksheet('No Data');
        }

        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', 'attachment; filename=ODC_Full_' + new Date().toISOString().slice(0, 10) + '.xlsx');

        await workbook.xlsx.write(res);
        res.end();

    } catch (error) {
        console.error('Export Error:', error);
        req.flash('error_msg', 'Gagal export data');
        res.redirect('/odc');
    }
});

// GET - List all ODC
router.get('/', async (req, res) => {
    try {
        const { search } = req.query;
        let where = {};
        if (search) {
            where = { nama_odc: { [Op.like]: `%${search}%` } };
        }
        const { rows, pagination } = await paginate(Odc, req, { where, order: [['created_at', 'DESC']] });
        res.render('odc/index', { title: 'ODC - SIMPELL', data: rows, pagination, search: search || '' });
    } catch (error) {
        console.error('Error:', error);
        req.flash('error_msg', 'Gagal memuat data');
        res.redirect('/');
    }
});

// GET - Create form
router.get('/create', isEditor, (req, res) => {
    res.render('odc/form', { title: 'Tambah ODC - SIMPELL', data: null });
});

// POST - Create
router.post('/', isEditor, async (req, res) => {
    try {
        const odc = await Odc.create(req.body);

        // Log activity
        await logActivity(req, 'CREATE', `Menambah data ODC: ${odc.nama_odc}`, 'odc', odc.id);

        req.flash('success_msg', 'Data ODC berhasil ditambahkan');
        res.redirect(`/odc/${odc.id}`);
    } catch (error) {
        console.error('Error:', error);
        req.flash('error_msg', 'Gagal menambahkan data');
        res.redirect('/odc/create');
    }
});

// GET - Detail
router.get('/:id', async (req, res) => {
    try {
        const data = await Odc.findByPk(req.params.id, {
            include: [{ model: OdcCore, as: 'cores', order: [['sector', 'ASC'], ['tray', 'ASC'], ['core_number', 'ASC']] }]
        });
        if (!data) {
            req.flash('error_msg', 'Data tidak ditemukan');
            return res.redirect('/odc');
        }

        // Group cores by sector, then by tray, then by tube
        // Handle placeholders: tray=0 means sector-only, tube=0 means tray-only
        var sectorMap = {};
        if (data.cores && data.cores.length > 0) {
            data.cores.forEach(function (core) {
                var sector = core.sector || 'Unknown';
                var tray = core.tray;
                var tube = core.tube;

                if (!sectorMap[sector]) {
                    sectorMap[sector] = { trays: {}, isPlaceholder: tray === 0 };
                }

                // If this is a sector placeholder (tray=0), skip adding to trays
                if (tray === 0) {
                    return;
                }

                if (!sectorMap[sector].trays[tray]) {
                    sectorMap[sector].trays[tray] = { tubes: {}, isPlaceholder: tube === 0 };
                }

                // If tray placeholder (tube=0), skip adding tubes
                if (tube === 0) {
                    return;
                }

                if (!sectorMap[sector].trays[tray].tubes[tube]) {
                    sectorMap[sector].trays[tray].tubes[tube] = {};
                }
                sectorMap[sector].trays[tray].tubes[tube][core.core_number] = core;
            });
        }

        // Get unique sectors and trays for iteration
        var sectors = Object.keys(sectorMap).sort();

        res.render('odc/detail', {
            title: `${data.nama_odc} - ODC`,
            data,
            coreColors: CORE_COLORS,
            statuses: STATUSES,
            colorCSS: COLOR_HEX,
            sectorMap,
            sectors
        });
    } catch (error) {
        console.error('Error:', error);
        req.flash('error_msg', 'Gagal memuat data');
        res.redirect('/odc');
    }
});

// GET - Edit form
router.get('/:id/edit', isEditor, async (req, res) => {
    try {
        const data = await Odc.findByPk(req.params.id);
        if (!data) {
            req.flash('error_msg', 'Data tidak ditemukan');
            return res.redirect('/odc');
        }
        res.render('odc/form', { title: 'Edit ODC - SIMPELL', data, returnTo: req.query.return_to });
    } catch (error) {
        req.flash('error_msg', 'Gagal memuat data');
        res.redirect('/odc');
    }
});

// PUT - Update
router.put('/:id', isEditor, async (req, res) => {
    try {
        await Odc.update(req.body, { where: { id: req.params.id } });
        req.flash('success_msg', 'Data berhasil diperbarui');
        const returnTo = req.query.return_to || `/odc/${req.params.id}`;
        res.redirect(returnTo);
    } catch (error) {
        req.flash('error_msg', 'Gagal memperbarui data');
        res.redirect(`/odc/${req.params.id}/edit`);
    }
});

// DELETE
router.delete('/:id', isEditor, async (req, res) => {
    try {
        await Odc.destroy({ where: { id: req.params.id } });
        req.flash('success_msg', 'Data berhasil dihapus');
        res.redirect('/odc');
    } catch (error) {
        req.flash('error_msg', 'Gagal menghapus data');
        res.redirect('/odc');
    }
});

// POST - Add Sector (Creates a placeholder record)
router.post('/:id/sectors', async (req, res) => {
    try {
        const { sector } = req.body;

        if (!sector || sector.trim() === '') {
            req.flash('error_msg', 'Nama sector tidak boleh kosong');
            return res.redirect(`/odc/${req.params.id}`);
        }

        // Check if sector already exists
        const existingSector = await OdcCore.findOne({
            where: {
                odc_id: req.params.id,
                sector: sector.trim()
            }
        });

        if (existingSector) {
            req.flash('error_msg', `Sector "${sector}" sudah ada`);
            return res.redirect(`/odc/${req.params.id}`);
        }

        // Create a placeholder record for the sector (tray=0 signals placeholder)
        await OdcCore.create({
            odc_id: req.params.id,
            sector: sector.trim(),
            tray: 0,
            tube: 0,
            tube_color: 'Blue',
            core_number: 0,
            core_color: 'Blue',
            status: 'None',
            destination: null,
            customer: null,
            description: null
        });

        req.flash('success_msg', `Sector "${sector}" berhasil ditambahkan`);
        res.redirect(`/odc/${req.params.id}`);
    } catch (error) {
        console.error('Error:', error);
        req.flash('error_msg', 'Gagal menambahkan sector');
        res.redirect(`/odc/${req.params.id}`);
    }
});

// POST - Add Tray (Creates a placeholder record)
router.post('/:id/trays', async (req, res) => {
    try {
        const { sector, tray } = req.body;

        if (!sector || !tray) {
            req.flash('error_msg', 'Sector dan Tray harus diisi');
            return res.redirect(`/odc/${req.params.id}`);
        }

        // Check if tray number is already used in a different sector
        const existingTray = await OdcCore.findOne({
            where: {
                odc_id: req.params.id,
                tray: parseInt(tray)
            }
        });

        if (existingTray && existingTray.sector !== sector && existingTray.tray !== 0) {
            req.flash('error_msg', `Tray ${tray} sudah digunakan di Sector ${existingTray.sector}`);
            return res.redirect(`/odc/${req.params.id}`);
        }

        // Check if this tray already exists in this sector
        const existingTrayInSector = await OdcCore.findOne({
            where: {
                odc_id: req.params.id,
                sector: sector,
                tray: parseInt(tray)
            }
        });

        if (existingTrayInSector) {
            req.flash('error_msg', `Tray ${tray} pada Sector "${sector}" sudah ada`);
            return res.redirect(`/odc/${req.params.id}`);
        }

        // Delete sector placeholder if exists (tray=0)
        await OdcCore.destroy({
            where: {
                odc_id: req.params.id,
                sector: sector,
                tray: 0
            }
        });

        // Create a placeholder record for the tray (tube=0 signals placeholder)
        await OdcCore.create({
            odc_id: req.params.id,
            sector: sector,
            tray: parseInt(tray),
            tube: 0,
            tube_color: 'Blue',
            core_number: 0,
            core_color: 'Blue',
            status: 'Active',
            destination: null,
            customer: null,
            description: null
        });

        req.flash('success_msg', `Tray ${tray} pada Sector "${sector}" berhasil ditambahkan`);
        res.redirect(`/odc/${req.params.id}`);
    } catch (error) {
        console.error('Error:', error);
        req.flash('error_msg', 'Gagal menambahkan tray');
        res.redirect(`/odc/${req.params.id}`);
    }
});

// POST - Add Tube (Creates all 12 cores for this tube automatically)
router.post('/:id/tubes', async (req, res) => {
    try {
        const { sector, tray, tube } = req.body;

        // Validation 1: Check if Tray Number is already assigned to a different Sector
        const existingTray = await OdcCore.findOne({
            where: {
                odc_id: req.params.id,
                tray: parseInt(tray)
            }
        });

        if (existingTray && existingTray.sector !== sector) {
            req.flash('error_msg', `Tray ${tray} sudah digunakan di Sector ${existingTray.sector}. Satu Tray hanya boleh ada di satu Sector.`);
            return res.redirect(`/odc/${req.params.id}`);
        }

        // Validation 2: Check if this tube already exists in the tray
        const existingTube = await OdcCore.findOne({
            where: {
                odc_id: req.params.id,
                sector: sector,
                tray: parseInt(tray),
                tube: parseInt(tube)
            }
        });

        if (existingTube) {
            req.flash('error_msg', `Tube ${tube} pada Tray ${tray} Sector ${sector} sudah ada`);
            return res.redirect(`/odc/${req.params.id}`);
        }

        const tubeColor = CORE_COLORS[((parseInt(tube) - 1) % 12)];

        // Delete tray placeholder if exists (tube=0)
        await OdcCore.destroy({
            where: {
                odc_id: req.params.id,
                sector: sector,
                tray: parseInt(tray),
                tube: 0
            }
        });

        // Create all 12 cores for this tube
        const corePromises = [];
        for (let c = 1; c <= 12; c++) {
            const coreColor = CORE_COLORS[(c - 1) % 12];
            corePromises.push(OdcCore.create({
                odc_id: req.params.id,
                sector,
                tray: parseInt(tray),
                tube: parseInt(tube),
                tube_color: tubeColor,
                core_number: c,
                core_color: coreColor,
                status: 'None', // Default status
                destination: null,
                customer: null,
                description: null
            }));
        }
        await Promise.all(corePromises);

        req.flash('success_msg', `Tube ${tube} berhasil ditambahkan dengan 12 core`);
        res.redirect(`/odc/${req.params.id}`);
    } catch (error) {
        console.error('Error:', error);
        req.flash('error_msg', 'Gagal menambahkan tube');
        res.redirect(`/odc/${req.params.id}`);
    }
});

// POST - Add Single Core
router.post('/:id/cores', async (req, res) => {
    try {
        const { sector, tray, tube, core_number, status, description_core, destination, customer, description } = req.body;

        // Validation: Check if core already exists
        const existingCore = await OdcCore.findOne({
            where: {
                odc_id: req.params.id,
                sector,
                tray: parseInt(tray),
                tube: parseInt(tube),
                core_number: parseInt(core_number)
            }
        });

        if (existingCore) {
            req.flash('error_msg', `Core ${core_number} pada Sector ${sector} Tray ${tray} Tube ${tube} sudah ada`);
            return res.redirect(`/odc/${req.params.id}`);
        }

        const tubeColor = CORE_COLORS[((parseInt(tube) - 1) % 12)];
        const coreColor = CORE_COLORS[((parseInt(core_number) - 1) % 12)];

        await OdcCore.create({
            odc_id: req.params.id,
            sector,
            tray: parseInt(tray),
            tube: parseInt(tube),
            tube_color: tubeColor,
            core_number: parseInt(core_number),
            core_color: coreColor,
            status,
            description_core,
            destination,
            customer,
            description
        });

        req.flash('success_msg', 'Core berhasil ditambahkan');
        res.redirect(`/odc/${req.params.id}`);
    } catch (error) {
        console.error('Error:', error);
        req.flash('error_msg', 'Gagal menambahkan core');
        res.redirect(`/odc/${req.params.id}`);
    }
});

// GET - Add Core Form (New per-column input style)
router.get('/:id/cores/new', async (req, res) => {
    try {
        const odc = await Odc.findByPk(req.params.id);
        if (!odc) {
            req.flash('error_msg', 'Data ODC tidak ditemukan');
            return res.redirect('/odc');
        }

        const { sector, tray, tube, core_number } = req.query;

        // Calculate colors for display
        const tubeColor = CORE_COLORS[((parseInt(tube) - 1) % 12)];
        const coreColor = CORE_COLORS[((parseInt(core_number) - 1) % 12)];

        res.render('odc/add-core', {
            title: `Tambah Core - ${odc.nama_odc}`,
            odc,
            location: {
                sector,
                tray: parseInt(tray),
                tube: parseInt(tube),
                tube_color: tubeColor,
                core_number: parseInt(core_number),
                core_color: coreColor
            },
            statuses: STATUSES
        });
    } catch (error) {
        console.error('Error:', error);
        req.flash('error_msg', 'Gagal memuat form tambah core');
        res.redirect(`/odc/${req.params.id}`);
    }
});

// GET - Edit Core Form
router.get('/:id/cores/:coreId/edit', async (req, res) => {
    try {
        const odc = await Odc.findByPk(req.params.id);
        const core = await OdcCore.findOne({
            where: { id: req.params.coreId, odc_id: req.params.id }
        });

        if (!odc || !core) {
            req.flash('error_msg', 'Data tidak ditemukan');
            return res.redirect(`/odc/${req.params.id}`);
        }

        res.render('odc/edit-core', {
            title: `Edit Core - ${odc.nama_odc}`,
            odc,
            core,
            statuses: STATUSES
        });
    } catch (error) {
        console.error('Error:', error);
        req.flash('error_msg', 'Gagal memuat form edit');
        res.redirect(`/odc/${req.params.id}`);
    }
});

// PUT - Update Core
router.put('/:id/cores/:coreId', async (req, res) => {
    try {
        const { status, description_core, destination, customer, description } = req.body;

        await OdcCore.update({
            status,
            description_core,
            destination,
            customer,
            description
        }, {
            where: { id: req.params.coreId, odc_id: req.params.id }
        });

        req.flash('success_msg', 'Core berhasil diperbarui');

        if (req.headers.accept && req.headers.accept.includes('application/json')) {
            return res.json({ success: true, message: 'Core berhasil diperbarui' });
        }

        res.redirect(`/odc/${req.params.id}`);
    } catch (error) {
        console.error('Error:', error);
        req.flash('error_msg', 'Gagal memperbarui core');
        res.redirect(`/odc/${req.params.id}/cores/${req.params.coreId}/edit`);
    }
});

// DELETE - Remove core
router.delete('/:id/cores/:coreId', async (req, res) => {
    try {
        await OdcCore.destroy({ where: { id: req.params.coreId } });
        req.flash('success_msg', 'Core berhasil dihapus');
        res.redirect(`/odc/${req.params.id}`);
    } catch (error) {
        req.flash('error_msg', 'Gagal menghapus core');
        res.redirect(`/odc/${req.params.id}`);
    }
});

// --- STRUCTURE MANAGEMENT PAGES ---

// GET - Edit Sector Page
router.get('/:id/structure/sector/:sector/edit', async (req, res) => {
    try {
        const odc = await Odc.findByPk(req.params.id);
        res.render('odc/edit-structure', {
            title: 'Edit Sector',
            odc,
            type: 'sector',
            query: { sector: req.params.sector }
        });
    } catch (e) { res.redirect(`/odc/${req.params.id}`); }
});

// GET - Edit Tray Page
router.get('/:id/structure/tray/:sector/:tray/edit', async (req, res) => {
    try {
        const odc = await Odc.findByPk(req.params.id);
        res.render('odc/edit-structure', {
            title: 'Edit Tray',
            odc,
            type: 'tray',
            query: { sector: req.params.sector, tray: req.params.tray }
        });
    } catch (e) { res.redirect(`/odc/${req.params.id}`); }
});

// GET - Edit Tube Page
router.get('/:id/structure/tube/:sector/:tray/:tube/edit', async (req, res) => {
    try {
        const odc = await Odc.findByPk(req.params.id);
        res.render('odc/edit-structure', {
            title: 'Edit Tube',
            odc,
            type: 'tube',
            query: { sector: req.params.sector, tray: req.params.tray, tube: req.params.tube }
        });
    } catch (e) { res.redirect(`/odc/${req.params.id}`); }
});


// --- STRUCTURE MANAGEMENT ACTIONS ---

// RENAME Sector
router.put('/:id/structure/sector', async (req, res) => {
    try {
        const { oldSector, newSector } = req.body;
        if (!oldSector || !newSector) {
            req.flash('error_msg', 'Nama Lama dan Baru harus diisi');
            return res.redirect(`/odc/${req.params.id}/structure/sector/${oldSector}/edit`);
        }

        const exists = await OdcCore.findOne({ where: { odc_id: req.params.id, sector: newSector } });
        if (exists) {
            req.flash('error_msg', 'Nama Sector baru sudah ada');
            return res.redirect(`/odc/${req.params.id}/structure/sector/${oldSector}/edit`);
        }

        await OdcCore.update({ sector: newSector }, { where: { odc_id: req.params.id, sector: oldSector } });
        req.flash('success_msg', 'Sector berhasil diubah');
        res.redirect(`/odc/${req.params.id}`);
    } catch (error) {
        console.error(error);
        req.flash('error_msg', 'Gagal mengubah sector');
        res.redirect(`/odc/${req.params.id}`);
    }
});

// DELETE Sector
router.delete('/:id/structure/sector', async (req, res) => {
    try {
        const { sector } = req.body;
        await OdcCore.destroy({ where: { odc_id: req.params.id, sector } });
        req.flash('success_msg', 'Sector berhasil dihapus');
        res.redirect(`/odc/${req.params.id}`);
    } catch (error) {
        console.error(error);
        req.flash('error_msg', 'Gagal menghapus sector');
        res.redirect(`/odc/${req.params.id}`);
    }
});

// RENAME Tray
router.put('/:id/structure/tray', async (req, res) => {
    try {
        const { sector, oldTray, newTray } = req.body;
        const exists = await OdcCore.findOne({ where: { odc_id: req.params.id, sector, tray: newTray } });
        if (exists) {
            req.flash('error_msg', 'Nomor Tray baru sudah ada di sector ini');
            return res.redirect(`/odc/${req.params.id}/structure/tray/${sector}/${oldTray}/edit`);
        }

        await OdcCore.update({ tray: newTray }, { where: { odc_id: req.params.id, sector, tray: oldTray } });
        req.flash('success_msg', 'Tray berhasil diubah');
        res.redirect(`/odc/${req.params.id}`);
    } catch (error) {
        console.error(error);
        req.flash('error_msg', 'Gagal mengubah tray');
        res.redirect(`/odc/${req.params.id}`);
    }
});

// DELETE Tray
router.delete('/:id/structure/tray', async (req, res) => {
    try {
        const { sector, tray } = req.body;
        await OdcCore.destroy({ where: { odc_id: req.params.id, sector, tray } });
        req.flash('success_msg', 'Tray berhasil dihapus');
        res.redirect(`/odc/${req.params.id}`);
    } catch (error) {
        console.error(error);
        req.flash('error_msg', 'Gagal menghapus tray');
        res.redirect(`/odc/${req.params.id}`);
    }
});

// DELETE Tube
router.delete('/:id/structure/tube', async (req, res) => {
    try {
        const { sector, tray, tube } = req.body;
        await OdcCore.destroy({ where: { odc_id: req.params.id, sector, tray, tube } });
        req.flash('success_msg', 'Tube berhasil dihapus');
        res.redirect(`/odc/${req.params.id}`);
    } catch (error) {
        console.error(error);
        req.flash('error_msg', 'Gagal menghapus tube');
        res.redirect(`/odc/${req.params.id}`);
    }
});

module.exports = router;
