const express = require('express');
const router = express.Router();
const { AksesFo, AksesFoNode, Pelanggan } = require('../models');
const { Op } = require('sequelize');
const { isEditor } = require('../middleware/auth');
const ExcelJS = require('exceljs');
const { pageState, pageMeta } = require('../utils/paginate');

const JENIS_BY_BASE = {
    '/akses-fo': 'FO',
    '/akses-fo-p2p': 'FO_P2P',
    '/akses-direct-lan': 'DIRECT_LAN',
    '/akses-fo-xconnect': 'FO_XCONNECT'
};
const BASE_BY_JENIS = {
    FO: '/akses-fo',
    FO_P2P: '/akses-fo-p2p',
    DIRECT_LAN: '/akses-direct-lan',
    FO_XCONNECT: '/akses-fo-xconnect'
};
const TITLE_BY_JENIS = {
    FO: 'Akses FO',
    FO_P2P: 'P2P/FO Core',
    DIRECT_LAN: 'Direct LAN',
    FO_XCONNECT: 'FO Xconnect'
};

router.use((req, res, next) => {
    const jenis = JENIS_BY_BASE[req.baseUrl] || 'FO';
    req.aksesJenis = jenis;
    req.aksesBase = BASE_BY_JENIS[jenis];
    res.locals.aksesJenis = jenis;
    res.locals.aksesBase = req.aksesBase;
    res.locals.aksesTitle = TITLE_BY_JENIS[jenis];
    next();
});

function baseOf(req) {
    return req.aksesBase || '/akses-fo';
}

function baseForJenis(jenis) {
    return BASE_BY_JENIS[jenis] || '/akses-fo';
}

function chosenJenis(req) {
    if (req.body.jenis && TITLE_BY_JENIS[req.body.jenis]) return req.body.jenis;
    return req.aksesJenis || 'FO';
}

function relocateIfOtherJenis(req, res, node) {
    if (!node || !node.jenis || node.jenis === req.aksesJenis) return false;
    res.redirect(baseForJenis(node.jenis) + req.url);
    return true;
}

// GET - Export Excel (Must be before dynamic /:node route to avoid conflict)
router.get('/export', async (req, res) => {
    try {
        const { search } = req.query;
        let where = {};
        let portWhere = {};

        // If search exists, we want to export:
        // 1. Nodes matching the search name
        // 2. Nodes containing ports matching the search (customer/jaringan)
        if (search) {
            // Find nodes matching name
            const matchingNodes = await AksesFoNode.findAll({
                where: { node: { [Op.like]: `%${search}%` } },
                attributes: ['id']
            });

            // Find ports matching customer
            const matchingPorts = await AksesFo.findAll({
                include: [{
                    model: Pelanggan,
                    as: 'pelanggan',
                    where: {
                        [Op.or]: [
                            { nama_pelanggan: { [Op.like]: `%${search}%` } },
                            { no_jaringan: { [Op.like]: `%${search}%` } }
                        ]
                    },
                    required: true
                }],
                attributes: ['node_id']
            });

            const nodeIds = new Set([
                ...matchingNodes.map(n => n.id),
                ...matchingPorts.map(p => p.node_id)
            ]);

            where = { id: { [Op.in]: Array.from(nodeIds) } };
        }
        where.jenis = req.aksesJenis;

        const nodes = await AksesFoNode.findAll({
            where,
            include: [{
                model: AksesFo,
                as: 'ports',
                include: [{ model: Pelanggan, as: 'pelanggan' }],
                // Order by numeric part of port_olt if possible, but simplest is ASC strings for now
            }],
            order: [['node', 'ASC']]
        });

        const workbook = new ExcelJS.Workbook();

        for (const node of nodes) {
            // Sanitize sheet name
            let sheetName = (node.node || 'Node').replace(/[*?:\/[\]]/g, '').substring(0, 31);
            let counter = 1;
            while (workbook.getWorksheet(sheetName)) {
                sheetName = (node.node || 'Node').substring(0, 28) + ` ${counter++}`;
            }

            const sheet = workbook.addWorksheet(sheetName);

            // Detailed Header Info
            sheet.mergeCells('A1:B1');
            sheet.getCell('A1').value = 'Node : ' + (node.node || '-');
            sheet.getCell('A1').font = { bold: true, size: 12 };

            sheet.mergeCells('A3:D3'); // Spacer

            // Table Header
            sheet.getRow(4).values = [
                'No', 'Port OLT', 'SN Modem', 'No Jaringan', 'Nama Pelanggan',
                'Redaman', 'Tanggal Redaman', 'Bandwidth', 'Keterangan'
            ];
            sheet.columns = [
                { key: 'no', width: 5 },
                { key: 'port_olt', width: 15 },
                { key: 'sn_modem', width: 20 },
                { key: 'no_jaringan', width: 20 },
                { key: 'nama_pelanggan', width: 30 },
                { key: 'redaman', width: 15 },
                { key: 'tanggal_redaman', width: 15 },
                { key: 'bandwidth', width: 15 },
                { key: 'keterangan', width: 30 }
            ];

            // Header Style
            const headerRow = sheet.getRow(4);
            headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
            headerRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4B5563' } };

            if (node.ports) {
                // Determine sort order for ports: try to sort naturally e.g. 1/1/1 before 1/1/2
                // Since port_olt is string, simple sort might result in 1, 10, 2.
                // Not strictly required but nice. Using standard db order (from query) or JS sort.
                // Let's stick to query order or just default array order.
                const sortedPorts = node.ports.sort((a, b) => {
                    return a.port_olt.localeCompare(b.port_olt, undefined, { numeric: true, sensitivity: 'base' });
                });

                sortedPorts.forEach((port, index) => {
                    const row = sheet.addRow({
                        no: index + 1,
                        port_olt: port.port_olt,
                        sn_modem: port.sn_modem || '-',
                        no_jaringan: port.pelanggan ? port.pelanggan.no_jaringan : '-',
                        nama_pelanggan: port.pelanggan ? port.pelanggan.nama_pelanggan : '-',
                        redaman: port.redaman_value || '',
                        tanggal_redaman: port.redaman_date || '',
                        bandwidth: port.bandwidth || '',
                        keterangan: port.keterangan || ''
                    });

                    // Alternating Row Color
                    if ((index + 1) % 2 === 0) {
                        row.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF9FAFB' } };
                    }
                });
            }
        }

        if (nodes.length === 0) {
            workbook.addWorksheet('No Data');
        }

        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', 'attachment; filename=Akses_FO_Full_' + new Date().toISOString().slice(0, 10) + '.xlsx');

        await workbook.xlsx.write(res);
        res.end();

    } catch (error) {
        console.error('Export Error:', error);
        req.flash('error_msg', 'Gagal export data');
        res.redirect(baseOf(req));
    }
});

// GET - List all nodes with their port counts
router.get('/', async (req, res) => {
    try {
        const { search } = req.query;
        let where = {};

        // If search is present, we might need to search in ports too
        // For simplicity now, let's search node name only in the main query
        if (search) {
            // 1. Find nodes where node name matches
            const matchingNodes = await AksesFoNode.findAll({
                where: { node: { [Op.like]: `%${search}%` }, jenis: req.aksesJenis },
                attributes: ['id']
            });

            // 2. Find nodes that have matching ports (by customer name or no_jaringan)
            const matchingPorts = await AksesFo.findAll({
                include: [{
                    model: Pelanggan,
                    as: 'pelanggan',
                    where: {
                        [Op.or]: [
                            { nama_pelanggan: { [Op.like]: `%${search}%` } },
                            { no_jaringan: { [Op.like]: `%${search}%` } }
                        ]
                    },
                    required: true
                }, {
                    model: AksesFoNode,
                    as: 'nodeInfo',
                    where: { jenis: req.aksesJenis },
                    attributes: [],
                    required: true
                }],
                attributes: ['node_id']
            });

            // Combine IDs
            const nodeIds = new Set([
                ...matchingNodes.map(n => n.id),
                ...matchingPorts.map(p => p.node_id)
            ]);

            where = {
                id: { [Op.in]: Array.from(nodeIds) }
            };
        }
        where.jenis = req.aksesJenis;

        const { page, limit, offset } = pageState(req);
        const total = await AksesFoNode.count({ where });
        const nodes = await AksesFoNode.findAll({
            where,
            include: [{
                model: AksesFo,
                as: 'ports',
                separate: true
            }],
            order: [['node', 'ASC']],
            limit,
            offset
        });

        res.render('akses-fo/index', {
            title: `${TITLE_BY_JENIS[req.aksesJenis]} - SIMPELL`,
            nodes,
            pagination: pageMeta(req, total, page, limit),
            search: search || ''
        });
    } catch (error) {
        console.error('Error:', error);
        req.flash('error_msg', 'Gagal memuat data Akses FO');
        res.redirect('/dashboard');
    }
});

// GET - Node detail with all OLT ports
router.get('/node/:nodeId', async (req, res) => {
    try {
        const existingNode = await AksesFoNode.findByPk(req.params.nodeId);
        if (!existingNode) {
            req.flash('error_msg', 'Node tidak ditemukan');
            return res.redirect(baseOf(req));
        }
        if (relocateIfOtherJenis(req, res, existingNode)) return;

        const nodeName = existingNode.node;
        const { search } = req.query;
        let portWhere = {};

        if (search) {
            portWhere = {
                [Op.or]: [
                    { '$pelanggan.nama_pelanggan$': { [Op.like]: `%${search}%` } },
                    { '$pelanggan.no_jaringan$': { [Op.like]: `%${search}%` } }
                ]
            };
        }

        // Fetch ports separately or via includer with where
        // Re-query to be safe and clean
        let ports = await AksesFo.findAll({
            where: {
                node_id: existingNode.id,
                ...portWhere
            },
            include: [{ model: Pelanggan, as: 'pelanggan' }]
        });

        // Natural Sort for port_olt
        ports = ports.sort((a, b) => {
            return a.port_olt.localeCompare(b.port_olt, undefined, { numeric: true, sensitivity: 'base' });
        });

        res.render('akses-fo/detail', {
            title: `Node ${nodeName} - SIMPELL`,
            nodeName,
            nodeId: existingNode.id,
            ports,
            search: search || ''
        });
    } catch (error) {
        console.error('Error:', error);
        req.flash('error_msg', 'Gagal memuat data');
        res.redirect(baseOf(req));
    }
});

// GET - Create node form (only node name)
router.get('/create', isEditor, (req, res) => {
    res.render('akses-fo/node-form', { title: 'Tambah Node - SIMPELL' });
});

// POST - Create node (only creates node entry)
router.post('/', isEditor, async (req, res) => {
    try {
        const nodeName = req.body.node.toUpperCase();
        // Check if node already exists
        const existing = await AksesFoNode.findOne({ where: { node: nodeName } });
        if (existing) {
            req.flash('error_msg', 'Node sudah ada');
            return res.redirect(baseOf(req) + '/create');
        }

        const jenis = chosenJenis(req);
        const newNode = await AksesFoNode.create({ node: nodeName, jenis });

        req.flash('success_msg', 'Node berhasil ditambahkan');
        res.redirect(baseForJenis(jenis) + '/node/' + newNode.id);
    } catch (error) {
        console.error('Error:', error);
        req.flash('error_msg', 'Gagal menambahkan node');
        res.redirect(baseOf(req) + '/create');
    }
});

// GET - Edit node form
router.get('/node/:nodeId/edit', isEditor, async (req, res) => {
    try {
        const node = await AksesFoNode.findByPk(req.params.nodeId);

        if (!node) {
            req.flash('error_msg', 'Node tidak ditemukan');
            return res.redirect(baseOf(req));
        }
        if (relocateIfOtherJenis(req, res, node)) return;

        const nodeName = node.node;
        res.render('akses-fo/node-edit', {
            title: `Edit Node ${nodeName} - SIMPELL`,
            nodeName,
            nodeId: node.id,
            node
        });
    } catch (error) {
        console.error('Error:', error);
        req.flash('error_msg', 'Gagal memuat form edit');
        res.redirect(baseOf(req));
    }
});

// PUT - Update node name
router.put('/node-update/:id', isEditor, async (req, res) => {
    try {
        const newNodeName = req.body.node.toUpperCase();
        const node = await AksesFoNode.findByPk(req.params.id);

        if (!node) {
            req.flash('error_msg', 'Node tidak ditemukan');
            return res.redirect(baseOf(req));
        }

        // Check if name already exists (if changed)
        if (newNodeName !== node.node) {
            const existing = await AksesFoNode.findOne({ where: { node: newNodeName } });
            if (existing) {
                req.flash('error_msg', 'Nama node sudah digunakan');
                return res.redirect(baseOf(req) + '/node/' + node.id + '/edit');
            }
        }

        const jenis = chosenJenis(req);
        await node.update({ node: newNodeName, jenis });
        req.flash('success_msg', 'Nama node berhasil diperbarui');
        res.redirect(baseForJenis(jenis) + '/node/' + node.id);
    } catch (error) {
        console.error('Error:', error);
        req.flash('error_msg', 'Gagal memperbarui nama node');
        res.redirect(baseOf(req));
    }
});

// GET - Create port form within node
router.get('/node/:nodeId/port/create', isEditor, async (req, res) => {
    // Verify node exists
    const nodeData = await AksesFoNode.findByPk(req.params.nodeId);
    if (!nodeData) {
        req.flash('error_msg', 'Node tidak ditemukan');
        return res.redirect(baseOf(req));
    }
    if (relocateIfOtherJenis(req, res, nodeData)) return;

    const nodeName = nodeData.node;
    const pelangganList = await Pelanggan.findAll({
        attributes: ['id', 'no_jaringan', 'nama_pelanggan'],
        order: [['nama_pelanggan', 'ASC']]
    });

    res.render('akses-fo/port-form', {
        title: `Tambah Port OLT - SIMPELL`,
        nodeName,
        nodeId: nodeData.id,
        data: null,
        pelangganList
    });
});

// POST - Create port within node
router.post('/node/:nodeId/port', isEditor, async (req, res) => {
    try {
        const nodeData = await AksesFoNode.findByPk(req.params.nodeId);

        if (!nodeData) {
            req.flash('error_msg', 'Node tidak ditemukan');
            return res.redirect(baseOf(req));
        }

        const payload = {
            node_id: nodeData.id,
            port_olt: req.body.port_olt,
            sn_modem: req.body.sn_modem || null,
            // no_jaringan & nama_pelanggan removed
            redaman_value: req.body.redaman_value || null,
            redaman_date: req.body.redaman_date || null,
            bandwidth: req.body.bandwidth || null,
            keterangan: req.body.keterangan || null,
            pelanggan_id: req.body.pelanggan_id || null
        };

        if (payload.pelanggan_id === '') payload.pelanggan_id = null;

        await AksesFo.create(payload);
        req.flash('success_msg', 'Port OLT berhasil ditambahkan');
        res.redirect(baseForJenis(nodeData.jenis) + '/node/' + nodeData.id);
    } catch (error) {
        console.error('Error:', error);
        req.flash('error_msg', 'Gagal menambahkan port');
        res.redirect(baseOf(req) + '/node/' + req.params.nodeId + '/port/create');
    }
});

// GET - Edit port form
router.get('/:id/edit', isEditor, async (req, res) => {
    try {
        const data = await AksesFo.findByPk(req.params.id, {
            include: [
                { model: AksesFoNode, as: 'nodeInfo' },
                { model: Pelanggan, as: 'pelanggan' }
            ]
        });

        if (!data) {
            req.flash('error_msg', 'Data tidak ditemukan');
            return res.redirect(baseOf(req));
        }
        if (data.nodeInfo && relocateIfOtherJenis(req, res, data.nodeInfo)) return;

        const pelangganList = await Pelanggan.findAll({
            attributes: ['id', 'no_jaringan', 'nama_pelanggan'],
            order: [['nama_pelanggan', 'ASC']]
        });

        res.render('akses-fo/port-form', {
            title: 'Edit Port OLT - SIMPELL',
            nodeName: data.nodeInfo.node,
            nodeId: data.nodeInfo.id,
            data,
            pelangganList,
            returnUrl: req.query.return_url // Pass return_url to view
        });
    } catch (error) {
        console.error('Error:', error);
        req.flash('error_msg', 'Gagal memuat data');
        res.redirect(baseOf(req));
    }
});

// PUT - Update port
router.put('/:id', isEditor, async (req, res) => {
    try {
        const data = await AksesFo.findByPk(req.params.id, {
            include: [{ model: AksesFoNode, as: 'nodeInfo' }]
        });

        if (!data) {
            req.flash('error_msg', 'Port tidak ditemukan');
            return res.redirect(baseOf(req));
        }

        const payload = {
            ...req.body,
            pelanggan_id: req.body.pelanggan_id || null
        };

        if (payload.pelanggan_id === '') payload.pelanggan_id = null;

        await AksesFo.update(payload, { where: { id: req.params.id } });
        req.flash('success_msg', 'Data berhasil diperbarui');
        if (req.query.return_url) {
            return res.redirect(req.query.return_url);
        }
        res.redirect(baseForJenis(data.nodeInfo.jenis) + '/node/' + data.nodeInfo.id);
    } catch (error) {
        console.error('Error:', error);
        req.flash('error_msg', 'Gagal memperbarui data');
        res.redirect(baseOf(req) + '/' + req.params.id + '/edit');
    }
});

// DELETE port
router.delete('/:id', isEditor, async (req, res) => {
    try {
        const data = await AksesFo.findByPk(req.params.id, {
            include: [{ model: AksesFoNode, as: 'nodeInfo' }]
        });

        if (!data) {
            req.flash('error_msg', 'Port tidak ditemukan');
            return res.redirect(baseOf(req));
        }

        const nodeName = data.nodeInfo.node;
        await AksesFo.destroy({ where: { id: req.params.id } });

        req.flash('success_msg', 'Port berhasil dihapus');
        if (req.query.return_url) {
            return res.redirect(req.query.return_url);
        }
        res.redirect(baseForJenis(data.nodeInfo.jenis) + '/node/' + data.nodeInfo.id);
    } catch (error) {
        console.error('Error:', error);
        req.flash('error_msg', 'Gagal menghapus data');
        res.redirect(baseOf(req));
    }
});

// DELETE entire node
router.delete('/node/:nodeId', isEditor, async (req, res) => {
    try {
        const nodeData = await AksesFoNode.findByPk(req.params.nodeId);

        if (nodeData) {
            // Delete all ports first
            await AksesFo.destroy({ where: { node_id: nodeData.id } });
            // Delete node
            await AksesFoNode.destroy({ where: { id: nodeData.id } });
            req.flash('success_msg', 'Node dan semua port berhasil dihapus');
        } else {
            req.flash('error_msg', 'Node tidak ditemukan');
        }
        res.redirect(baseOf(req));
    } catch (error) {
        console.error('Error:', error);
        req.flash('error_msg', 'Gagal menghapus node');
        res.redirect(baseOf(req));
    }
});

// GET /:id - Port Detail
router.get('/:id', async (req, res) => {
    try {
        const data = await AksesFo.findByPk(req.params.id, {
            include: [
                { model: AksesFoNode, as: 'nodeInfo' },
                { model: Pelanggan, as: 'pelanggan' }
            ]
        });

        if (!data) {
            req.flash('error_msg', 'Data tidak ditemukan');
            return res.redirect(baseOf(req));
        }
        if (data.nodeInfo && relocateIfOtherJenis(req, res, data.nodeInfo)) return;

        res.render('akses-fo/port-detail', {
            title: 'Detail Port OLT - SIMPELL',
            data,
            nodeName: data.nodeInfo ? data.nodeInfo.node : null
        });
    } catch (error) {
        console.error('Error:', error);
        res.redirect(baseOf(req));
    }
});

module.exports = router;
