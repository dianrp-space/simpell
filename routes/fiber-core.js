const express = require('express');
const { Op } = require('sequelize');
const { isEditor } = require('../middleware/auth');
const sequelize = require('../config/database');
const { pageState, pageMeta } = require('../utils/paginate');
const ExcelJS = require('exceljs');

function createFiberCoreRouter({ Central, Core, Column, base, label }) {
    const router = express.Router();
    router.use((req, res, next) => {
        res.locals.fiberBase = base;
        res.locals.moduleTitle = label.indexTitle;
        res.locals.moduleSubtitle = label.indexSubtitle;
        next();
    });

    function cleanSectorName(value) {
        return String(value || '').replace(/\s+/g, ' ').trim();
    }

    const CORE_COLORS = ['Blue', 'Orange', 'Green', 'Brown', 'Gray', 'White', 'Red', 'Black', 'Yellow', 'Purple', 'Pink', 'Aqua'];
    const STATUSES = ['Active', 'Cut', 'Alokasi', 'Idle', 'None'];

    function columnsFor(ColumnModel, sectorName, centralId) {
        return ColumnModel.findAll({
            where: { sector: sectorName, central_id: centralId || null },
            order: [['sort_order', 'ASC'], ['id', 'ASC']]
        });
    }

    // ==========================================
    // CENTRAL ROUTES
    // ==========================================

    const COLOR_HEX = {
        'Blue': '#0000FF', 'Orange': '#FF8C00', 'Green': '#008000', 'Brown': '#8B4513',
        'Gray': '#808080', 'White': '#FFFFFF', 'Red': '#FF0000', 'Black': '#000000',
        'Yellow': '#FFD700', 'Purple': '#800080', 'Pink': '#FF69B4', 'Aqua': '#00FFFF'
    };

    // GET - Export Excel (Must be before /:id generic route)
    router.get('/export', async (req, res) => {
        try {
            const { search } = req.query;
            let where = {};
            if (search) {
                where = { name: { [Op.like]: `%${search}%` } };
            }

            const centrals = await Central.findAll({
                where,
                order: [['name', 'ASC']],
                include: [{
                    model: Core,
                    as: 'sectors',
                    order: [['sector', 'ASC'], ['tube_number', 'ASC'], ['core_number', 'ASC']]
                }]
            });

            const workbook = new ExcelJS.Workbook();

            for (const central of centrals) {
                // Sanitize sheet name
                let sheetName = central.name.replace(/[*?:\/[\]]/g, '').substring(0, 31);
                let counter = 1;
                while (workbook.getWorksheet(sheetName)) {
                    sheetName = central.name.substring(0, 28) + ` ${counter++}`;
                }

                const sheet = workbook.addWorksheet(sheetName);

                sheet.columns = [
                    { header: 'Sector', key: 'sector', width: 15 },
                    { header: 'Tube', key: 'tube_number', width: 8 },
                    { header: 'Warna Tube', key: 'tube_color', width: 15 },
                    { header: 'Core', key: 'core_number', width: 8 },
                    { header: 'Warna Core', key: 'core_color', width: 15 },
                    { header: 'Status', key: 'status', width: 10 },
                    { header: 'Deskripsi Core', key: 'description_core', width: 25 },
                    { header: 'Destination', key: 'destination', width: 20 },
                    { header: 'Customer', key: 'customer', width: 20 },
                    { header: 'Keterangan', key: 'keterangan', width: 25 }
                ];

                // Header style
                sheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
                sheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4B5563' } };

                if (central.sectors) {
                    // Grouping Logic Helpers
                    let lastSector = null;
                    let sectorColorState = 0;
                    const sectorColors = ['FFD1FAE5', 'FFECFDF5']; // Green-100, Green-50

                    let lastTube = null;
                    let tubeColorState = 0;
                    const tubeColors = ['FFDBEAFE', 'FFEFF6FF']; // Blue-100, Blue-50

                    central.sectors.forEach(core => {
                        // Grouping Logic
                        if (core.sector !== lastSector) {
                            sectorColorState = 1 - sectorColorState;
                            lastSector = core.sector;
                            lastTube = null; // Reset tube tracking on sector change
                        }
                        if (core.tube_number !== lastTube) {
                            tubeColorState = 1 - tubeColorState;
                            lastTube = core.tube_number;
                        }

                        const row = sheet.addRow({
                            sector: core.sector,
                            tube_number: core.tube_number,
                            tube_color: core.tube_color,
                            core_number: core.core_number,
                            core_color: core.core_color,
                            status: core.status,
                            description_core: core.description_core || '',
                            destination: core.destination || '',
                            customer: core.customer || '',
                            keterangan: core.keterangan || ''
                        });

                        // Styling Group Columns (Sector & Tube Number background)
                        try {
                            const sectorCell = row.getCell('sector');
                            sectorCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: sectorColors[sectorColorState] } };
                            sectorCell.font = { color: { argb: 'FF000000' } };

                            const tubeCell = row.getCell('tube_number');
                            tubeCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: tubeColors[tubeColorState] } };
                            tubeCell.font = { color: { argb: 'FF000000' } };
                        } catch (e) { console.error('Styling error:', e); }

                        // Styling Color Columns
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
                    });
                }
            }

            if (centrals.length === 0) {
                workbook.addWorksheet('No Data');
            }

            res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
            res.setHeader('Content-Disposition', 'attachment; filename=' + label.file + '_' + new Date().toISOString().slice(0, 10) + '.xlsx');

            await workbook.xlsx.write(res);
            res.end();

        } catch (error) {
            console.error('Export Error:', error);
            req.flash('error_msg', 'Gagal export data');
            res.redirect(base);
        }
    });

    // GET - List all Centrals
    router.get('/', async (req, res) => {
        try {
            const { search } = req.query;
            let where = {};
            if (search) {
                where = {
                    name: { [Op.like]: `%${search}%` }
                };
            }

            const { page, limit, offset } = pageState(req);
            const total = await Central.count({ where });
            const centrals = await Central.findAll({
                attributes: [
                    'id', 'name', 'description',
                    [sequelize.fn('COUNT', sequelize.fn('DISTINCT', sequelize.col('sectors.sector'))), 'sector_count']
                ],
                include: [{
                    model: Core,
                    as: 'sectors',
                    attributes: []
                }],
                group: [`${Central.name}.id`],
                where,
                order: [['name', 'ASC']],
                subQuery: false,
                limit,
                offset
            });

            res.render('otb-phd/index', {
                title: label.listTitle,
                centrals: centrals.map(c => c.get({ plain: true })),
                pagination: pageMeta(req, total, page, limit),
                search: search || ''
            });
        } catch (error) {
            console.error('Error:', error);
            req.flash('error_msg', 'Gagal memuat data central');
            res.redirect('/');
        }
    });

    // GET - Create Central Form
    router.get('/central/create', isEditor, (req, res) => {
        res.render('otb-phd/central-form', {
            title: label.createCentralTitle
        });
    });

    // POST - Create Central
    router.post('/central', isEditor, async (req, res) => {
        try {
            const { name, description } = req.body;
            await Central.create({ name, description });
            req.flash('success_msg', 'Central berhasil dibuat');
            res.redirect(base);
        } catch (error) {
            console.error('Error:', error);
            req.flash('error_msg', 'Gagal membuat central');
            res.redirect(base + '/central/create');
        }
    });

    // GET - Central Detail (List Sectors)
    // Replaces old Index view
    router.get('/central/:id', async (req, res) => {
        try {
            const central = await Central.findByPk(req.params.id, {
                attributes: [
                    'id', 'name', 'description',
                    [sequelize.fn('COUNT', sequelize.fn('DISTINCT', sequelize.col('sectors.sector'))), 'sector_count']
                ],
                include: [{
                    model: Core,
                    as: 'sectors',
                    attributes: []
                }],
                group: [`${Central.name}.id`]
            });
            if (!central) {
                return res.redirect(base);
            }

            const { search } = req.query;
            let where = { central_id: central.id };

            if (search) {
                where[Op.and] = [
                    { central_id: central.id },
                    {
                        [Op.or]: [
                            { sector: { [Op.like]: `%${search}%` } },
                            { destination: { [Op.like]: `%${search}%` } },
                            { customer: { [Op.like]: `%${search}%` } }
                        ]
                    }
                ];
            }

            // Get sectors with tube and core counts
            const sectors = await Core.findAll({
                attributes: [
                    'sector',
                    [sequelize.fn('COUNT', sequelize.col('id')), 'core_count'],
                    [sequelize.fn('MAX', sequelize.col('tube_number')), 'tube_count'],
                    [sequelize.fn('SUM', sequelize.literal("CASE WHEN status IN ('Idle', 'None') THEN 1 ELSE 0 END")), 'available_count'],
                    [sequelize.fn('SUM', sequelize.literal("CASE WHEN status = 'Active' THEN 1 ELSE 0 END")), 'used_count'],
                    [sequelize.fn('SUM', sequelize.literal("CASE WHEN status = 'Alokasi' THEN 1 ELSE 0 END")), 'allocation_count']
                ],
                where,
                group: ['sector'],
                order: [['sector', 'ASC']],
                raw: true
            });

            res.render('otb-phd/central-detail', {
                title: `${central.name} - ${label.short}`,
                central: central.get({ plain: true }),
                sectors,
                search: search || '',
                coreColors: CORE_COLORS,
                statuses: STATUSES
            });
        } catch (error) {
            console.error('Error:', error);
            req.flash('error_msg', 'Gagal memuat detail central');
            res.redirect(base);
        }
    });

    // GET - Edit Central Form
    router.get('/central/:id/edit', isEditor, async (req, res) => {
        try {
            const central = await Central.findByPk(req.params.id);
            res.render('otb-phd/central-form', {
                title: 'Edit Central - SIMPELL',
                central,
                returnTo: req.query.return_to
            });
        } catch (error) {
            res.redirect(base);
        }
    });

    // PUT - Update Central
    router.put('/central/:id', isEditor, async (req, res) => {
        try {
            const { name, description } = req.body;
            await Central.update({ name, description }, {
                where: { id: req.params.id }
            });
            req.flash('success_msg', 'Central berhasil diperbarui');
            const returnTo = req.query.return_to || base;
            res.redirect(returnTo);
        } catch (error) {
            req.flash('error_msg', 'Gagal update central');
            res.redirect(`${base}/central/${req.params.id}/edit`);
        }
    });

    // DELETE - Delete Central
    router.delete('/central/:id', isEditor, async (req, res) => {
        try {
            // Cascade delete is handled by database/sequelize if configured, 
            // but explicit delete is safer for verification
            await Central.destroy({ where: { id: req.params.id } });
            req.flash('success_msg', 'Central dan data terkait berhasil dihapus');
            res.redirect(base);
        } catch (error) {
            req.flash('error_msg', 'Gagal menghapus central');
            res.redirect(base);
        }
    });


    // ==========================================
    // SECTOR ROUTES
    // ==========================================

    // GET - Create sector form
    router.get('/central/:id/sector/create', isEditor, async (req, res) => {
        try {
            const central = await Central.findByPk(req.params.id);
            if (!central) return res.redirect(base);

            res.render('otb-phd/sector-form', {
                title: label.createSectorTitle,
                coreColors: CORE_COLORS,
                statuses: STATUSES,
                central
            });
        } catch (error) {
            res.redirect(base);
        }
    });

    // POST - Create new sector with tubes and cores
    router.post('/sector', isEditor, async (req, res) => {
        try {
            const sector = cleanSectorName(req.body.sector);
            const { tube_count, central_id } = req.body;
            const tubeCountNum = parseInt(tube_count);

            if (!sector) {
                req.flash('error_msg', 'Nama sector wajib diisi');
                return res.redirect(`${base}/central/${central_id}/sector/create`);
            }

            // Check if sector already exists (Global check or Per-Central? Preserving Global for now)
            const existing = await Core.findOne({ where: { sector } });
            if (existing) {
                req.flash('error_msg', `Sector "${sector}" sudah ada`);
                return res.redirect(`${base}/central/${central_id}/sector/create`);
            }

            const cores = [];
            for (let t = 1; t <= tubeCountNum; t++) {
                const tubeColor = CORE_COLORS[(t - 1) % 12];
                for (let c = 1; c <= 12; c++) {
                    cores.push({
                        sector: sector,
                        tube_number: t,
                        tube_color: tubeColor,
                        core_number: c,
                        core_color: CORE_COLORS[(c - 1) % 12],
                        status: 'None',
                        central_id: central_id // Link to Central
                    });
                }
            }

            await Core.bulkCreate(cores);

            req.flash('success_msg', `Sector "${sector}" berhasil dibuat`);
            res.redirect(`${base}/central/${central_id}`);
        } catch (error) {
            console.error('Error:', error);
            req.flash('error_msg', 'Gagal membuat sector');
            // Fallback redirect if central_id is missing, though it shouldn't be
            res.redirect(base);
        }
    });

    // GET - Sector detail (View Matrix)
    router.get('/sector/:sectorName', async (req, res) => {
        try {
            const sectorName = decodeURIComponent(req.params.sectorName);

            const cores = await Core.findAll({
                where: { sector: sectorName },
                order: [
                    ['tube_number', 'ASC'],
                    ['core_number', 'ASC']
                ]
            });

            if (cores.length === 0) {
                req.flash('error_msg', 'Sector tidak ditemukan');
                return res.redirect(base);
            }

            // Get Central info from the first core
            const centralId = cores[0].central_id;
            let central = null;
            if (centralId) {
                central = await Central.findByPk(centralId);
            }

            // Group by tube
            // Group by tube
            const tubesMap = {};
            cores.forEach(core => {
                if (!tubesMap[core.tube_number]) {
                    tubesMap[core.tube_number] = {
                        tube_number: core.tube_number,
                        tube_color: core.tube_color,
                        cores: []
                    };
                }
                tubesMap[core.tube_number].cores.push(core);
            });

            const tubes = Object.values(tubesMap).sort((a, b) => a.tube_number - b.tube_number);

            const viewData = {
                title: `Detail Sector ${sectorName} - SIMPELL`,
                sectorName,
                tubes,
                totalCores: cores.length,
                central,
                coreColors: CORE_COLORS,
                statuses: STATUSES
            };
            if (Column) {
                viewData.customColumns = (await columnsFor(Column, sectorName, centralId)).map((column) => column.toJSON());
            }
            res.render('otb-phd/detail', viewData);
        } catch (error) {
            console.error('Error:', error);
            req.flash('error_msg', 'Gagal memuat data');
            res.redirect(base);
        }
    });

    router.post('/sector/:sectorName/columns', isEditor, async (req, res) => {
        const sectorName = decodeURIComponent(req.params.sectorName);
        const back = `${base}/sector/${encodeURIComponent(sectorName)}`;
        try {
            if (!Column) return res.redirect(back);
            const name = String(req.body.name || '').trim().slice(0, 40);
            if (!name) {
                req.flash('error_msg', 'Nama kolom wajib diisi');
                return res.redirect(back);
            }
            const sample = await Core.findOne({ where: { sector: sectorName } });
            if (!sample) {
                req.flash('error_msg', 'Sector tidak ditemukan');
                return res.redirect(base);
            }
            const existing = await columnsFor(Column, sectorName, sample.central_id);
            if (existing.length >= 12) {
                req.flash('error_msg', 'Maksimal 12 kolom tambahan');
                return res.redirect(back);
            }
            if (existing.some((column) => column.name.toLowerCase() === name.toLowerCase())) {
                req.flash('error_msg', `Kolom "${name}" sudah ada`);
                return res.redirect(back);
            }
            const sortOrder = existing.reduce((max, column) => Math.max(max, column.sort_order || 0), 0) + 1;
            await Column.create({
                central_id: sample.central_id,
                sector: sectorName,
                name,
                sort_order: sortOrder
            });
            req.flash('success_msg', `Kolom "${name}" berhasil ditambahkan`);
            res.redirect(back);
        } catch (error) {
            console.error('Error:', error);
            req.flash('error_msg', 'Gagal menambah kolom');
            res.redirect(back);
        }
    });

    router.delete('/sector/:sectorName/columns/:columnId', isEditor, async (req, res) => {
        const sectorName = decodeURIComponent(req.params.sectorName);
        const back = `${base}/sector/${encodeURIComponent(sectorName)}`;
        try {
            if (!Column) return res.redirect(back);
            const column = await Column.findOne({ where: { id: req.params.columnId, sector: sectorName } });
            if (!column) {
                req.flash('error_msg', 'Kolom tidak ditemukan');
                return res.redirect(back);
            }
            const cores = await Core.findAll({ where: { sector: sectorName, central_id: column.central_id } });
            for (const core of cores) {
                if (!core.custom_values || !core.custom_values[String(column.id)]) continue;
                const values = { ...core.custom_values };
                delete values[String(column.id)];
                core.custom_values = values;
                core.changed('custom_values', true);
                await core.save();
            }
            await column.destroy();
            req.flash('success_msg', `Kolom "${column.name}" berhasil dihapus`);
            res.redirect(back);
        } catch (error) {
            console.error('Error:', error);
            req.flash('error_msg', 'Gagal menghapus kolom');
            res.redirect(back);
        }
    });

    // GET - Edit sector name form
    router.get('/sector/:sectorName/edit', isEditor, async (req, res) => {
        try {
            const sectorName = decodeURIComponent(req.params.sectorName);

            // Get current max tube number
            const maxTube = await Core.max('tube_number', {
                where: { sector: sectorName }
            });

            // Get central ID for cancel button redirect ? 
            // We can just redirect to detail or central list.

            res.render('otb-phd/sector-edit', {
                title: label.editSectorTitle,
                sectorName,
                currentTubeCount: maxTube || 0,
                returnTo: req.query.return_to
            });
        } catch (error) {
            console.error('Error:', error);
            res.redirect(base);
        }
    });

    // PUT - Update sector name and tube count
    router.put('/sector/:sectorName', isEditor, async (req, res) => {
        try {
            const oldSectorName = decodeURIComponent(req.params.sectorName);
            const newSectorName = cleanSectorName(req.body.newSectorName);
            const { tube_count } = req.body;
            const newTubeCount = parseInt(tube_count);

            if (!newSectorName) {
                req.flash('error_msg', 'Nama sector wajib diisi');
                return res.redirect(`${base}/sector/${encodeURIComponent(oldSectorName)}/edit`);
            }

            // 1. Handle Sector Name Change
            if (oldSectorName !== newSectorName) {
                // Check if new name exists
                const existing = await Core.findOne({ where: { sector: newSectorName } });
                if (existing) {
                    req.flash('error_msg', `Sector "${newSectorName}" sudah ada`);
                    return res.redirect(`${base}/sector/${encodeURIComponent(oldSectorName)}/edit`);
                }

                // Update all records
                await Core.update(
                    { sector: newSectorName },
                    { where: { sector: oldSectorName } }
                );
                if (Column) {
                    await Column.update(
                        { sector: newSectorName },
                        { where: { sector: oldSectorName } }
                    );
                }
            }

            const currentSectorName = newSectorName;

            // 2. Handle Tube Count Change
            const currentMaxTube = await Core.max('tube_number', { where: { sector: currentSectorName } }) || 0;

            // Ensure we know the central_id for new cores
            const oneCore = await Core.findOne({ where: { sector: currentSectorName } });
            const centralId = oneCore ? oneCore.central_id : null;

            if (newTubeCount > currentMaxTube) {
                // INCREASE: Add new tubes
                const coresToAdd = [];
                for (let t = currentMaxTube + 1; t <= newTubeCount; t++) {
                    const tubeColor = CORE_COLORS[(t - 1) % 12];
                    for (let c = 1; c <= 12; c++) {
                        coresToAdd.push({
                            sector: currentSectorName,
                            tube_number: t,
                            tube_color: tubeColor,
                            core_number: c,
                            core_color: CORE_COLORS[(c - 1) % 12],
                            status: 'None',
                            central_id: centralId
                        });
                    }
                }
                if (coresToAdd.length > 0) {
                    await Core.bulkCreate(coresToAdd);
                }
                req.flash('success_msg', 'Sector berhasil diperbarui dan tube ditambahkan');

            } else if (newTubeCount < currentMaxTube) {
                // DECREASE: Validate and Remove tubes
                const unsafeCores = await Core.findAll({
                    where: {
                        sector: currentSectorName,
                        tube_number: { [Op.gt]: newTubeCount },
                        [Op.or]: [
                            { status: { [Op.ne]: 'None' } },
                            { description_core: { [Op.ne]: null } },
                            { destination: { [Op.ne]: null } },
                            { customer: { [Op.ne]: null } },
                            { keterangan: { [Op.ne]: null } }
                        ]
                    }
                });

                if (unsafeCores.length > 0) {
                    req.flash('error_msg', `Gagal mengurangi tube. Tube ${newTubeCount + 1}-${currentMaxTube} mengandung data aktif.`);
                    return res.redirect(`${base}/sector/${encodeURIComponent(currentSectorName)}/edit`);
                }

                await Core.destroy({
                    where: {
                        sector: currentSectorName,
                        tube_number: { [Op.gt]: newTubeCount }
                    }
                });
                req.flash('success_msg', 'Sector berhasil diperbarui dan tube dikurangi');
            } else {
                if (oldSectorName !== newSectorName) {
                    req.flash('success_msg', 'Nama sector berhasil diperbarui');
                } else {
                    req.flash('info_msg', 'Tidak ada perubahan');
                }
            }

            // Redirect logic
            let returnTo = req.query.return_to;

            // If name changed, and we have a return_to that points to the old sector detail,
            // we must update return_to to point to the new sector name
            if (oldSectorName !== newSectorName && returnTo) {
                const oldPath = `${base}/sector/${encodeURIComponent(oldSectorName)}`;
                const newPath = `${base}/sector/${encodeURIComponent(newSectorName)}`;
                if (returnTo.includes(oldPath)) {
                    returnTo = returnTo.replace(oldPath, newPath);
                }
            }

            if (returnTo) {
                res.redirect(returnTo);
            } else {
                // Default to Sector Detail as requested
                res.redirect(`${base}/sector/${encodeURIComponent(newSectorName)}`);
            }
        } catch (error) {
            console.error('Error:', error);
            req.flash('error_msg', 'Gagal memperbarui sector');
            res.redirect(base);
        }
    });

    // DELETE - Delete entire sector
    router.delete('/sector/:sectorName', isEditor, async (req, res) => {
        try {
            const sectorName = decodeURIComponent(req.params.sectorName);

            // Find central ID before deleting
            const core = await Core.findOne({ where: { sector: sectorName } });
            const centralId = core ? core.central_id : null;

            await Core.destroy({ where: { sector: sectorName } });
            if (Column) await Column.destroy({ where: { sector: sectorName } });
            req.flash('success_msg', `Sector "${sectorName}" berhasil dihapus`);

            if (centralId) {
                res.redirect(`${base}/central/${centralId}`);
            } else {
                res.redirect(base);
            }
        } catch (error) {
            console.error('Error:', error);
            req.flash('error_msg', 'Gagal menghapus sector');
            res.redirect(base);
        }
    });

    // GET - Edit individual core
    router.get('/:id/edit', isEditor, async (req, res) => {
        try {
            const data = await Core.findByPk(req.params.id);
            if (!data) {
                req.flash('error_msg', 'Data tidak ditemukan');
                return res.redirect(base);
            }

            res.render('otb-phd/edit', {
                title: label.editCoreTitle,
                data,
                coreColors: CORE_COLORS,
                statuses: STATUSES
            });
        } catch (error) {
            res.redirect(base);
        }
    });

    // PUT - Update individual core
    router.put('/:id', isEditor, async (req, res) => {
        try {
            const { status, description_core, destination, customer, keterangan } = req.body;
            const core = await Core.findByPk(req.params.id);

            if (!core) {
                req.flash('error_msg', 'Data tidak ditemukan');
                return res.redirect(base);
            }

            const updateData = {};
            if (status !== undefined) updateData.status = status;
            if (description_core !== undefined) updateData.description_core = description_core;
            if (destination !== undefined) updateData.destination = destination;
            if (customer !== undefined) updateData.customer = customer;
            if (keterangan !== undefined) updateData.keterangan = keterangan;
            if (Column && req.body.custom_column_id !== undefined) {
                const column = await Column.findOne({
                    where: {
                        id: req.body.custom_column_id,
                        sector: core.sector,
                        central_id: core.central_id
                    }
                });
                if (!column) {
                    req.flash('error_msg', 'Kolom tidak ditemukan');
                    return res.redirect(`${base}/sector/${encodeURIComponent(core.sector)}`);
                }
                const values = { ...(core.custom_values || {}) };
                const text = String(req.body.custom_value || '').trim();
                if (text) values[String(column.id)] = text;
                else delete values[String(column.id)];
                updateData.custom_values = values;
            }

            await core.update(updateData);

            if (req.headers.accept && req.headers.accept.includes('application/json')) {
                return res.json({ success: true, message: 'Data berhasil diperbarui' });
            }

            req.flash('success_msg', 'Data berhasil diperbarui');
            res.redirect(`${base}/sector/${encodeURIComponent(core.sector)}`);
        } catch (error) {
            console.error('Error:', error);
            if (req.headers.accept && req.headers.accept.includes('application/json')) {
                return res.status(500).json({ success: false, message: 'Gagal memperbarui data' });
            }
            res.redirect(`${base}/${req.params.id}/edit`);
        }
    });

    // DELETE - Delete individual core
    router.delete('/:id', isEditor, async (req, res) => {
        try {
            const core = await Core.findByPk(req.params.id);
            const sectorName = core ? core.sector : null;

            await Core.destroy({ where: { id: req.params.id } });
            req.flash('success_msg', 'Core berhasil dihapus');

            if (sectorName) {
                // Check if any cores left in this sector
                const remaining = await Core.count({ where: { sector: sectorName } });
                if (remaining > 0) {
                    res.redirect(`${base}/sector/${encodeURIComponent(sectorName)}`);
                } else {
                    res.redirect(base);
                }
            } else {
                res.redirect(base);
            }
        }
        catch (error) {
            req.flash('error_msg', 'Gagal menghapus');
            res.redirect(base);
        }
    });

    return router;
}

module.exports = { createFiberCoreRouter };
