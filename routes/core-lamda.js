const express = require('express');
const router = express.Router();
const { CoreLamda, CoreLamdaSegment, CoreLamdaSegmentName } = require('../models');
const { Op } = require('sequelize');
const logActivity = require('../utils/activityLogger');
const { isEditor } = require('../middleware/auth');

// Helper: Core colors
const CORE_COLORS = [
    'Blue', 'Orange', 'Green', 'Brown', 'Gray', 'White',
    'Red', 'Black', 'Yellow', 'Purple', 'Pink', 'Aqua'
];

const ExcelJS = require('exceljs');
const { paginate } = require('../utils/paginate');

const COLOR_MAP_ARGB = {
    'Blue': 'FF0000FF',
    'Orange': 'FFFFA500',
    'Green': 'FF008000',
    'Brown': 'FFA52A2A',
    'Gray': 'FF808080',
    'White': 'FFFFFFFF',
    'Red': 'FFFF0000',
    'Black': 'FF000000',
    'Yellow': 'FFFFFF00',
    'Purple': 'FF800080',
    'Pink': 'FFFFC0CB',
    'Aqua': 'FF00FFFF'
};

const TEXT_COLOR_LIGHT = 'FFFFFFFF';
const TEXT_COLOR_DARK = 'FF000000';

// Colors that need light text
const DARK_BACKGROUNDS = ['Blue', 'Green', 'Brown', 'Red', 'Black', 'Purple'];

// GET - Export Excel
router.get('/export', async (req, res) => {
    try {
        const { search } = req.query;
        let where = {};
        if (search) {
            where = {
                [Op.or]: [
                    { lokasi: { [Op.like]: `%${search}%` } },
                    { description: { [Op.like]: `%${search}%` } }
                ]
            };
        }

        const locations = await CoreLamda.findAll({
            where,
            order: [['created_at', 'DESC']],
            include: [
                {
                    model: CoreLamdaSegment,
                    as: 'segments'
                },
                {
                    model: CoreLamdaSegmentName,
                    as: 'segmentNames'
                }
            ]
        });

        const workbook = new ExcelJS.Workbook();

        for (const loc of locations) {
            // Sanitize sheet name (max 31 chars, no special chars)
            let sheetName = loc.lokasi.replace(/[*?:\/[\]]/g, '').substring(0, 31);
            // Ensure unique sheet name
            let counter = 1;
            while (workbook.getWorksheet(sheetName)) {
                sheetName = loc.lokasi.substring(0, 28) + ` ${counter++}`;
            }

            const sheet = workbook.addWorksheet(sheetName);

            // Sort segment names
            const segmentNames = loc.segmentNames ? loc.segmentNames.sort((a, b) => a.segment_order - b.segment_order) : [];

            // Build Headers
            const columns = [
                { header: 'No', key: 'no', width: 5 },
                { header: 'Tube', key: 'tube_number', width: 8 },
                { header: 'Warna Tube', key: 'tube_color', width: 15 },
                { header: 'Core', key: 'core_number', width: 8 },
                { header: 'Warna Core', key: 'core_color', width: 15 }
            ];

            // Dynamic headers for each segment
            segmentNames.forEach((sn, index) => {
                columns.push(
                    { header: sn.name, key: `seg_${sn.id}`, width: 25 },
                    { header: 'Panjang (m)', key: `len_${sn.id}`, width: 12 }
                );
            });
            columns.push({ header: 'Deskripsi', key: 'description', width: 30 }); // Core description

            sheet.columns = columns;

            // Style Header
            sheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
            sheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4B5563' } };

            // Map segments for easy access
            const segmentMap = {};
            loc.segments.forEach(seg => {
                const key = `${seg.tube_number}-${seg.core_number}`;
                if (!segmentMap[key]) segmentMap[key] = {};
                if (seg.segment_name_id) {
                    segmentMap[key][seg.segment_name_id] = seg;
                }
                // Store description if present (taken from any segment of this core, usually first)
                if (seg.description) segmentMap[key].description = seg.description;
            });

            // Generate rows
            for (let i = 1; i <= loc.cable_capacity; i++) {
                const coreNoInTube = (i - 1) % 12 + 1;
                const tubeNo = Math.ceil(i / 12);
                const coreColor = CORE_COLORS[(coreNoInTube - 1) % 12];
                const tubeColor = CORE_COLORS[(tubeNo - 1) % 12];

                const rowData = {
                    no: i,
                    tube_number: tubeNo,
                    tube_color: tubeColor,
                    core_number: coreNoInTube,
                    core_color: coreColor
                };

                const key = `${tubeNo}-${coreNoInTube}`;
                const coreData = segmentMap[key] || {};

                // Add Description
                rowData.description = coreData.description || '';

                // Add Segment Data
                segmentNames.forEach(sn => {
                    const seg = coreData[sn.id];
                    rowData[`seg_${sn.id}`] = seg ? (seg.segmen || '-') : '-';
                    rowData[`len_${sn.id}`] = seg ? (seg.segmen_length || '-') : '-';
                });

                const row = sheet.addRow(rowData);

                // Add slight background for Tube separation (default)
                if (tubeNo % 2 === 0) {
                    row.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF9FAFB' } }; // Very light gray
                }

                // Apply Colors to Specific Cells
                const applyColor = (key, colorName) => {
                    const argb = COLOR_MAP_ARGB[colorName];
                    if (argb) {
                        const cell = row.getCell(key);
                        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: argb } };
                        // Check if dark background
                        if (DARK_BACKGROUNDS.includes(colorName)) {
                            cell.font = { color: { argb: TEXT_COLOR_LIGHT } };
                        } else {
                            cell.font = { color: { argb: TEXT_COLOR_DARK } };
                        }
                        // Add border for visibility if White
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

                applyColor('tube_number', tubeColor);
                applyColor('tube_color', tubeColor);
                applyColor('core_number', coreColor);
                applyColor('core_color', coreColor);
            }
        }

        if (locations.length === 0) {
            workbook.addWorksheet('No Data');
        }

        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', 'attachment; filename=Core_Lamda_Full_' + new Date().toISOString().slice(0, 10) + '.xlsx');

        await workbook.xlsx.write(res);
        res.end();

    } catch (error) {
        console.error('Export Error:', error);
        req.flash('error_msg', 'Gagal export data');
        res.redirect('/core-lamda');
    }
});

// GET - List all Core Lamda
router.get('/', async (req, res) => {
    try {
        const { search } = req.query;
        let where = {};

        if (search) {
            where = {
                [Op.or]: [
                    { lokasi: { [Op.like]: `%${search}%` } },
                    { description: { [Op.like]: `%${search}%` } }
                ]
            };
        }

        const { rows, pagination } = await paginate(CoreLamda, req, {
            where,
            order: [['created_at', 'DESC']],
            include: [{ model: CoreLamdaSegmentName, as: 'segmentNames', separate: true }]
        });

        res.render('core-lamda/index', {
            title: 'Core Lamda - SIMPELL',
            pageTitle: 'Core Lamda',
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

// GET - Create form
router.get('/create', isEditor, (req, res) => {
    res.render('core-lamda/form', {
        title: 'Tambah Core Lamda - SIMPELL',
        pageTitle: 'Tambah Core Lamda',
        data: null,
        coreColors: CORE_COLORS
    });
});

// POST - Create new Core Lamda
router.post('/', isEditor, async (req, res) => {
    try {
        const { lokasi, cable_capacity, description } = req.body;

        const coreLamda = await CoreLamda.create({
            lokasi,
            cable_capacity: parseInt(cable_capacity),
            description
        });

        // Log activity
        await logActivity(req, 'CREATE', `Menambah data Core Lamda: ${lokasi}`, 'core_lamda', coreLamda.id);

        req.flash('success_msg', 'Data Core Lamda berhasil ditambahkan');
        res.redirect(`/core-lamda/${coreLamda.id}`);
    } catch (error) {
        console.error('Error:', error);
        req.flash('error_msg', 'Gagal menambahkan data');
        res.redirect('/core-lamda/create');
    }
});

// GET - Table View
router.get('/:id/table', async (req, res) => {
    try {
        const data = await CoreLamda.findByPk(req.params.id, {
            include: [{
                model: CoreLamdaSegment,
                as: 'segments'
            }]
        });

        if (!data) {
            req.flash('error_msg', 'Data tidak ditemukan');
            return res.redirect('/core-lamda');
        }

        const sortedSegments = data.segments.sort((a, b) => {
            if (a.tube_number !== b.tube_number) {
                return a.tube_number - b.tube_number;
            }
            return a.core_number - b.core_number;
        });

        // Map for easy lookup: tube-core -> segment data
        const coreMap = {};
        sortedSegments.forEach(seg => {
            const key = `${seg.tube_number}-${seg.core_number}`;
            if (!coreMap[key]) {
                coreMap[key] = [];
            }
            coreMap[key].push(seg);
        });

        res.render('core-lamda/table', {
            title: `${data.lokasi} - Core Table`,
            pageTitle: data.lokasi,
            data,
            coreMap,
            coreColors: CORE_COLORS
        });
    } catch (error) {
        console.error('Error:', error);
        req.flash('error_msg', 'Gagal memuat data');
        res.redirect('/core-lamda');
    }
});

// GET - Segment Form (Add new segment)
router.get('/:id/cores/:tubeNumber/:coreNumber/segment/new', async (req, res) => {
    try {
        const tubeNumber = parseInt(req.params.tubeNumber);
        const coreNumber = parseInt(req.params.coreNumber);
        const coreColor = CORE_COLORS[(coreNumber - 1) % 12];

        // Check if this core already has segments
        const existingSegment = await CoreLamdaSegment.findOne({
            where: {
                core_lamda_id: req.params.id,
                tube_number: tubeNumber,
                core_number: coreNumber
            }
        });

        res.render('core-lamda/segment-form', {
            title: 'Add Segment',
            coreLamdaId: req.params.id,
            tubeNumber,
            coreNumber,
            coreColor,
            segment: null,
            isNewCore: !existingSegment
        });
    } catch (error) {
        console.error('Error:', error);
        req.flash('error_msg', 'Gagal memuat form');
        res.redirect(`/core-lamda/${req.params.id}`);
    }
});

// GET - Segment Form (Edit existing segment)
router.get('/:id/segments/:segmentId/edit', async (req, res) => {
    try {
        const segment = await CoreLamdaSegment.findByPk(req.params.segmentId);

        if (!segment) {
            req.flash('error_msg', 'Segment tidak ditemukan');
            return res.redirect(`/core-lamda/${req.params.id}`);
        }

        const coreColor = CORE_COLORS[(segment.core_number - 1) % 12];

        res.render('core-lamda/segment-form', {
            title: 'Edit Segment',
            coreLamdaId: req.params.id,
            tubeNumber: segment.tube_number,
            coreNumber: segment.core_number,
            coreColor,
            segment,
            isNewCore: false
        });
    } catch (error) {
        console.error('Error:', error);
        req.flash('error_msg', 'Gagal memuat form');
        res.redirect(`/core-lamda/${req.params.id}`);
    }
});

// GET - Description Form
router.get('/:id/cores/:tubeNumber/:coreNumber/description/edit', async (req, res) => {
    try {
        const tubeNumber = parseInt(req.params.tubeNumber);
        const coreNumber = parseInt(req.params.coreNumber);
        const coreColor = CORE_COLORS[(coreNumber - 1) % 12];

        // Get current description from first segment
        const existingSegment = await CoreLamdaSegment.findOne({
            where: {
                core_lamda_id: req.params.id,
                tube_number: tubeNumber,
                core_number: coreNumber
            }
        });

        res.render('core-lamda/description-form', {
            title: existingSegment?.description ? 'Edit Description' : 'Add Description',
            coreLamdaId: req.params.id,
            tubeNumber,
            coreNumber,
            coreColor,
            currentDescription: existingSegment?.description || ''
        });
    } catch (error) {
        console.error('Error:', error);
        req.flash('error_msg', 'Gagal memuat form');
        res.redirect(`/core-lamda/${req.params.id}`);
    }
});

// PUT - Update existing segment
router.put('/:id/segments/:segmentId', async (req, res) => {
    try {
        const { segmen, segmen_length } = req.body;

        await CoreLamdaSegment.update({
            segmen: segmen || null,
            segmen_length: segmen_length || null
        }, {
            where: { id: req.params.segmentId }
        });

        req.flash('success_msg', 'Segment berhasil diperbarui');
        res.redirect(`/core-lamda/${req.params.id}`);
    } catch (error) {
        console.error('Error:', error);
        req.flash('error_msg', 'Gagal memperbarui segment');
        res.redirect(`/core-lamda/${req.params.id}`);
    }
});

// GET - Detail with segments grouped by core
router.get('/:id', async (req, res) => {
    try {
        const data = await CoreLamda.findByPk(req.params.id, {
            include: [
                {
                    model: CoreLamdaSegment,
                    as: 'segments',
                    include: [{
                        model: CoreLamdaSegmentName,
                        as: 'segmentName'
                    }]
                },
                {
                    model: CoreLamdaSegmentName,
                    as: 'segmentNames'
                }
            ]
        });

        if (!data) {
            req.flash('error_msg', 'Data tidak ditemukan');
            return res.redirect('/core-lamda');
        }

        // Get segment names sorted by order
        const segmentNames = data.segmentNames ? data.segmentNames.sort((a, b) => a.segment_order - b.segment_order) : [];

        // Sort segments by tube_number then core_number
        const sortedSegments = data.segments.sort((a, b) => {
            if (a.tube_number !== b.tube_number) {
                return a.tube_number - b.tube_number;
            }
            return a.core_number - b.core_number;
        });

        // Map for easy lookup: tube-core-segmentNameId -> segment data
        const coreMap = {};
        sortedSegments.forEach(seg => {
            const key = `${seg.tube_number}-${seg.core_number}`;
            if (!coreMap[key]) {
                coreMap[key] = { segments: {}, description: seg.description };
            }
            if (seg.segment_name_id) {
                coreMap[key].segments[seg.segment_name_id] = seg;
            }
        });

        res.render('core-lamda/table', {
            title: `${data.lokasi} - Core Lamda`,
            pageTitle: data.lokasi,
            data,
            segmentNames,
            coreMap,
            coreColors: CORE_COLORS
        });
    } catch (error) {
        console.error('Error:', error);
        req.flash('error_msg', 'Gagal memuat data');
        res.redirect('/core-lamda');
    }
});

// GET - Table View
router.get('/:id/table', async (req, res) => {
    try {
        const data = await CoreLamda.findByPk(req.params.id, {
            include: [{
                model: CoreLamdaSegment,
                as: 'segments'
            }]
        });

        if (!data) {
            req.flash('error_msg', 'Data tidak ditemukan');
            return res.redirect('/core-lamda');
        }

        const sortedSegments = data.segments.sort((a, b) => {
            if (a.tube_number !== b.tube_number) {
                return a.tube_number - b.tube_number;
            }
            return a.core_number - b.core_number;
        });

        // Map for easy lookup: tube-core -> segment data
        const coreMap = {};
        sortedSegments.forEach(seg => {
            const key = `${seg.tube_number}-${seg.core_number}`;
            if (!coreMap[key]) {
                coreMap[key] = [];
            }
            coreMap[key].push(seg);
        });

        res.render('core-lamda/table', {
            title: `${data.lokasi} - Core Table`,
            pageTitle: data.lokasi,
            data,
            coreMap,
            coreColors: CORE_COLORS
        });
    } catch (error) {
        console.error('Error:', error);
        req.flash('error_msg', 'Gagal memuat data');
        res.redirect('/core-lamda');
    }
});

// GET - Edit form
router.get('/:id/edit', isEditor, async (req, res) => {
    try {
        const data = await CoreLamda.findByPk(req.params.id);

        if (!data) {
            req.flash('error_msg', 'Data tidak ditemukan');
            return res.redirect('/core-lamda');
        }

        res.render('core-lamda/form', {
            title: 'Edit Core Lamda - SIMPELL',
            pageTitle: 'Edit Core Lamda',
            data,
            coreColors: CORE_COLORS,
            returnTo: req.query.return_to
        });
    } catch (error) {
        console.error('Error:', error);
        req.flash('error_msg', 'Gagal memuat data');
        res.redirect('/core-lamda');
    }
});

// PUT - Update
router.put('/:id', isEditor, async (req, res) => {
    try {
        const { lokasi, cable_capacity, description } = req.body;

        await CoreLamda.update({
            lokasi,
            cable_capacity: parseInt(cable_capacity),
            description
        }, {
            where: { id: req.params.id }
        });

        req.flash('success_msg', 'Data berhasil diperbarui');
        const returnTo = req.query.return_to || '/core-lamda';
        res.redirect(returnTo);
    } catch (error) {
        console.error('Error:', error);
        req.flash('error_msg', 'Gagal memperbarui data');
        res.redirect(`/core-lamda/${req.params.id}/edit`);
    }
});

// DELETE
router.delete('/:id', isEditor, async (req, res) => {
    try {
        await CoreLamda.destroy({ where: { id: req.params.id } });
        req.flash('success_msg', 'Data berhasil dihapus');
        res.redirect('/core-lamda');
    } catch (error) {
        console.error('Error:', error);
        req.flash('error_msg', 'Gagal menghapus data');
        res.redirect('/core-lamda');
    }
});

// POST - Add new core with optional initial segment
router.post('/:id/cores', isEditor, async (req, res) => {
    try {
        const { tube_number, core_number, description, segmen, segmen_length } = req.body;

        const tubeColor = CORE_COLORS[((parseInt(tube_number) - 1) % 12)];
        const coreColor = CORE_COLORS[((parseInt(core_number) - 1) % 12)];

        // Check if this core already exists for this tube
        const existing = await CoreLamdaSegment.findOne({
            where: {
                core_lamda_id: req.params.id,
                tube_number: parseInt(tube_number),
                core_number: parseInt(core_number)
            }
        });

        if (existing) {
            req.flash('error_msg', `Core ${core_number} pada Tube ${tube_number} sudah ada`);
            return res.redirect(`/core-lamda/${req.params.id}`);
        }

        // Create first segment for this core
        await CoreLamdaSegment.create({
            core_lamda_id: req.params.id,
            tube_number: parseInt(tube_number),
            tube_color: tubeColor,
            core_number: parseInt(core_number),
            core_color: coreColor,
            segmen: segmen || null,
            segmen_length: segmen_length || null,
            description: description || null
        });

        req.flash('success_msg', 'Core berhasil ditambahkan');
        res.redirect(`/core-lamda/${req.params.id}`);
    } catch (error) {
        console.error('Error:', error);
        req.flash('error_msg', 'Gagal menambahkan core');
        res.redirect(`/core-lamda/${req.params.id}`);
    }
});

// POST - Add segment to existing core
router.post('/:id/cores/:tubeNumber/:coreNumber/segments', isEditor, async (req, res) => {
    try {
        const { segmen, segmen_length } = req.body;
        const tubeNumber = parseInt(req.params.tubeNumber);
        const coreNumber = parseInt(req.params.coreNumber);

        // Get existing segment to copy core info
        const existingSegment = await CoreLamdaSegment.findOne({
            where: {
                core_lamda_id: req.params.id,
                tube_number: tubeNumber,
                core_number: coreNumber
            }
        });

        if (!existingSegment) {
            req.flash('error_msg', 'Core tidak ditemukan');
            return res.redirect(`/core-lamda/${req.params.id}`);
        }

        await CoreLamdaSegment.create({
            core_lamda_id: req.params.id,
            tube_number: tubeNumber,
            tube_color: existingSegment.tube_color,
            core_number: coreNumber,
            core_color: existingSegment.core_color,
            segmen: segmen || null,
            segmen_length: segmen_length || null,
            description: existingSegment.description // Copy description from first segment
        });

        req.flash('success_msg', 'Segment berhasil ditambahkan');
        res.redirect(`/core-lamda/${req.params.id}`);
    } catch (error) {
        console.error('Error:', error);
        req.flash('error_msg', 'Gagal menambahkan segment');
        res.redirect(`/core-lamda/${req.params.id}`);
    }
});

// PUT - Update description for a core
router.put('/:id/cores/:tubeNumber/:coreNumber/description', isEditor, async (req, res) => {
    try {
        const { description } = req.body;
        const tubeNumber = parseInt(req.params.tubeNumber);
        const coreNumber = parseInt(req.params.coreNumber);

        await CoreLamdaSegment.update(
            { description: description || null },
            {
                where: {
                    core_lamda_id: req.params.id,
                    tube_number: tubeNumber,
                    core_number: coreNumber
                }
            }
        );

        req.flash('success_msg', 'Deskripsi berhasil diperbarui');
        res.redirect(`/core-lamda/${req.params.id}`);
    } catch (error) {
        console.error('Error:', error);
        req.flash('error_msg', 'Gagal memperbarui deskripsi');
        res.redirect(`/core-lamda/${req.params.id}`);
    }
});

// DELETE - Remove segment
router.delete('/:id/segments/:segmentId', isEditor, async (req, res) => {
    try {
        await CoreLamdaSegment.destroy({ where: { id: req.params.segmentId } });
        req.flash('success_msg', 'Segment berhasil dihapus');
        res.redirect(`/core-lamda/${req.params.id}`);
    } catch (error) {
        console.error('Error:', error);
        req.flash('error_msg', 'Gagal menghapus segment');
        res.redirect(`/core-lamda/${req.params.id}`);
    }
});

// DELETE - Remove all segments for a core (delete core)
router.delete('/:id/cores/:tubeNumber/:coreNumber', isEditor, async (req, res) => {
    try {
        await CoreLamdaSegment.destroy({
            where: {
                core_lamda_id: req.params.id,
                tube_number: parseInt(req.params.tubeNumber),
                core_number: parseInt(req.params.coreNumber)
            }
        });
        req.flash('success_msg', 'Core dan semua segmentnya berhasil dihapus');
        res.redirect(`/core-lamda/${req.params.id}`);
    } catch (error) {
        console.error('Error:', error);
        req.flash('error_msg', 'Gagal menghapus core');
        res.redirect(`/core-lamda/${req.params.id}`);
    }
});

// =====================
// SEGMENT NAME ROUTES
// =====================

// GET - List/Manage segment names
router.get('/:id/segment-names', async (req, res) => {
    try {
        const data = await CoreLamda.findByPk(req.params.id, {
            include: [{
                model: CoreLamdaSegmentName,
                as: 'segmentNames'
            }]
        });

        if (!data) {
            req.flash('error_msg', 'Data tidak ditemukan');
            return res.redirect('/core-lamda');
        }

        const segmentNames = data.segmentNames.sort((a, b) => a.segment_order - b.segment_order);

        res.render('core-lamda/segment-names', {
            title: 'Kelola Segment Names - ' + data.lokasi,
            pageTitle: 'Kelola Segment Names',
            data,
            segmentNames
        });
    } catch (error) {
        console.error('Error:', error);
        req.flash('error_msg', 'Gagal memuat data');
        res.redirect(`/core-lamda/${req.params.id}`);
    }
});

// POST - Add new segment name
router.post('/:id/segment-names', isEditor, async (req, res) => {
    try {
        const { name } = req.body;

        // Get max order
        const maxOrder = await CoreLamdaSegmentName.max('segment_order', {
            where: { core_lamda_id: req.params.id }
        }) || 0;

        await CoreLamdaSegmentName.create({
            core_lamda_id: req.params.id,
            segment_order: maxOrder + 1,
            name
        });

        req.flash('success_msg', 'Segment name berhasil ditambahkan');
        res.redirect(`/core-lamda/${req.params.id}/segment-names`);
    } catch (error) {
        console.error('Error:', error);
        req.flash('error_msg', 'Gagal menambahkan segment name');
        res.redirect(`/core-lamda/${req.params.id}/segment-names`);
    }
});

// PUT - Update segment name
router.put('/:id/segment-names/:nameId', isEditor, async (req, res) => {
    try {
        const { name } = req.body;

        await CoreLamdaSegmentName.update(
            { name },
            { where: { id: req.params.nameId } }
        );

        req.flash('success_msg', 'Segment name berhasil diperbarui');
        res.redirect(`/core-lamda/${req.params.id}/segment-names`);
    } catch (error) {
        console.error('Error:', error);
        req.flash('error_msg', 'Gagal memperbarui segment name');
        res.redirect(`/core-lamda/${req.params.id}/segment-names`);
    }
});

// DELETE - Remove segment name
router.delete('/:id/segment-names/:nameId', isEditor, async (req, res) => {
    try {
        // Delete all segments using this name first
        await CoreLamdaSegment.destroy({
            where: { segment_name_id: req.params.nameId }
        });

        await CoreLamdaSegmentName.destroy({
            where: { id: req.params.nameId }
        });

        req.flash('success_msg', 'Segment name berhasil dihapus');
        res.redirect(`/core-lamda/${req.params.id}/segment-names`);
    } catch (error) {
        console.error('Error:', error);
        req.flash('error_msg', 'Gagal menghapus segment name');
        res.redirect(`/core-lamda/${req.params.id}/segment-names`);
    }
});

// =====================
// CORE LENGTH ROUTES
// =====================

// GET - Form to edit length for a specific core and segment
router.get('/:id/cores/:tubeNumber/:coreNumber/segment/:segmentNameId/edit', isEditor, async (req, res) => {
    try {
        const tubeNumber = parseInt(req.params.tubeNumber);
        const coreNumber = parseInt(req.params.coreNumber);
        const segmentNameId = parseInt(req.params.segmentNameId);
        const coreColor = CORE_COLORS[(coreNumber - 1) % 12];

        const segmentName = await CoreLamdaSegmentName.findByPk(segmentNameId);

        // Find existing segment for this core
        const existingSegment = await CoreLamdaSegment.findOne({
            where: {
                core_lamda_id: req.params.id,
                tube_number: tubeNumber,
                core_number: coreNumber,
                segment_name_id: segmentNameId
            }
        });

        res.render('core-lamda/length-form', {
            title: 'Edit Panjang Segment',
            coreLamdaId: req.params.id,
            tubeNumber,
            coreNumber,
            coreColor,
            segmentName,
            segment: existingSegment
        });
    } catch (error) {
        console.error('Error:', error);
        req.flash('error_msg', 'Gagal memuat form');
        res.redirect(`/core-lamda/${req.params.id}`);
    }
});

// POST - Save length for a specific core and segment
router.post('/:id/cores/:tubeNumber/:coreNumber/segment/:segmentNameId', isEditor, async (req, res) => {
    try {
        const { segmen_length } = req.body;
        const tubeNumber = parseInt(req.params.tubeNumber);
        const coreNumber = parseInt(req.params.coreNumber);
        const segmentNameId = parseInt(req.params.segmentNameId);

        const tubeColor = CORE_COLORS[(tubeNumber - 1) % 12];
        const coreColor = CORE_COLORS[(coreNumber - 1) % 12];

        // Find or create segment
        const [segment, created] = await CoreLamdaSegment.findOrCreate({
            where: {
                core_lamda_id: req.params.id,
                tube_number: tubeNumber,
                core_number: coreNumber,
                segment_name_id: segmentNameId
            },
            defaults: {
                core_lamda_id: req.params.id,
                tube_number: tubeNumber,
                tube_color: tubeColor,
                core_number: coreNumber,
                core_color: coreColor,
                segment_name_id: segmentNameId,
                segmen_length: segmen_length || null
            }
        });

        if (!created) {
            await segment.update({
                segmen_length: segmen_length || null
            });
        }

        req.flash('success_msg', 'Panjang segment berhasil disimpan');
        res.redirect(`/core-lamda/${req.params.id}`);
    } catch (error) {
        console.error('Error:', error);
        req.flash('error_msg', 'Gagal menyimpan panjang segment');
        res.redirect(`/core-lamda/${req.params.id}`);
    }
});

module.exports = router;
