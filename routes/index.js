const express = require('express');
const router = express.Router();

const CoreLamda = require('../models/CoreLamda');
const Odc = require('../models/Odc');
const PendingGgn = require('../models/PendingGgn');
const { AksesFo } = require('../models/AksesFo');

const OtbPhd = require('../models/OtbPhd');
const { DataCore } = require('../models/DataCore');
const AksesVsatStarlink = require('../models/AksesVsatStarlink');
const AksesM2m = require('../models/AksesM2m');
const AksesVsatTdma = require('../models/AksesVsatTdma');
const AsetFo = require('../models/AsetFo');
const DataHh = require('../models/DataHh');
const DataClosure = require('../models/DataClosure');
const DataOdp = require('../models/DataOdp');
const RecordGgn = require('../models/RecordGgn');
const Pelanggan = require('../models/Pelanggan');
const sequelize = require('../config/database');
const { Op } = require('sequelize');

const Cpe = require('../models/Cpe');
const RadioLinkAp = require('../models/RadioLinkAp');
const RadioLinkClient = require('../models/RadioLinkClient');
const AksesThirdParty = require('../models/AksesThirdParty');

// Helper to fetch dashboard stats
async function getDashboardStats() {
    // Get current month start and end for Record GGN
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

    // Fetch all counts in parallel
    const [
        core_lamda, odc, data_core,
        starlink, m2m, soltem, tdma,
        aset_fo, data_hh, data_closure, data_odp,
        cpe, radio_link_ap, radio_link_client, third_party
    ] = await Promise.all([
        CoreLamda.count(), Odc.count(), DataCore.count(),
        AksesVsatStarlink.count(),
        AksesM2m.count({ where: { [Op.or]: [{ layanan: 'M2M' }, { layanan: null }, { layanan: '' }] } }),
        AksesM2m.count({ where: { layanan: { [Op.in]: ['SOLTEM', 'SOLTEMP'] } } }),
        AksesVsatTdma.count(),
        AsetFo.count(), DataHh.count(), DataClosure.count(), DataOdp.count(),
        Cpe.count(), RadioLinkAp.count(), RadioLinkClient.count(), AksesThirdParty.count()
    ]);

    // Custom queries for specific counts
    const { AksesFoNode } = require('../models/AksesFo');

    // OTB PHD - count distinct sectors
    const otb_phd_sectors = await OtbPhd.count({
        distinct: true,
        col: 'sector'
    });

    const [akses_fo, akses_fo_p2p, akses_direct_lan] = await Promise.all([
        AksesFoNode.count({ where: { jenis: 'FO' } }),
        AksesFoNode.count({ where: { jenis: 'FO_P2P' } }),
        AksesFoNode.count({ where: { jenis: 'DIRECT_LAN' } })
    ]);

    // Pending GGN - count by status
    const pending_ggn_pending = await PendingGgn.count({ where: { status: 'Pending' } });
    const pending_ggn_progress = await PendingGgn.count({ where: { status: 'Progress' } });
    const pending_ggn_done = await PendingGgn.count({ where: { status: 'Done' } });
    const pending_ggn_cancelled = await PendingGgn.count({ where: { status: 'Cancelled' } });

    // Record GGN - count current month only (based on tanggal field)
    const record_ggn = await RecordGgn.count({
        where: {
            tanggal: {
                [Op.between]: [monthStart, monthEnd]
            }
        }
    });

    // Record GGN - Total (All time)
    const record_ggn_total = await RecordGgn.count();

    // Pelanggan statistics
    const [pelanggan_total, pelanggan_active, pelanggan_inactive, pelanggan_suspended] = await Promise.all([
        Pelanggan.count(),
        Pelanggan.count({ where: { status: 'Active' } }),
        Pelanggan.count({ where: { status: 'Inactive' } }),
        Pelanggan.count({ where: { status: 'Suspended' } })
    ]);

    const stats = {
        core_lamda, odc, otb_phd: otb_phd_sectors, data_core,
        akses_fo, akses_fo_p2p, akses_direct_lan, starlink, m2m, soltem, tdma,
        aset_fo, data_hh, data_closure, data_odp,
        cpe, radio_link_ap, radio_link_client, third_party,
        pending_ggn: {
            total: pending_ggn_pending + pending_ggn_progress + pending_ggn_done + pending_ggn_cancelled,
            pending: pending_ggn_pending,
            progress: pending_ggn_progress,
            done: pending_ggn_done,
            cancelled: pending_ggn_cancelled
        }, record_ggn, record_ggn_total,
        pelanggan_total, pelanggan_active, pelanggan_inactive, pelanggan_suspended
    };

    // --- Chart Data Aggregation (Record GGN & PM) ---

    // Daily (Last 30 days)
    const dailyData = await RecordGgn.findAll({
        attributes: [
            [sequelize.fn('DATE', sequelize.col('tanggal')), 'date'],
            [sequelize.fn('COUNT', sequelize.col('id')), 'count']
        ],
        where: {
            tanggal: { [Op.gte]: sequelize.literal("DATE_SUB(NOW(), INTERVAL 30 DAY)") }
        },
        group: [sequelize.fn('DATE', sequelize.col('tanggal'))],
        order: [[sequelize.fn('DATE', sequelize.col('tanggal')), 'ASC']],
        raw: true
    });

    // Monthly (Last 12 months)
    const monthlyData = await RecordGgn.findAll({
        attributes: [
            [sequelize.fn('DATE_FORMAT', sequelize.col('tanggal'), '%Y-%m'), 'month'],
            [sequelize.fn('COUNT', sequelize.col('id')), 'count']
        ],
        where: {
            tanggal: { [Op.gte]: sequelize.literal("DATE_SUB(NOW(), INTERVAL 12 MONTH)") }
        },
        group: [sequelize.fn('DATE_FORMAT', sequelize.col('tanggal'), '%Y-%m')],
        order: [[sequelize.fn('DATE_FORMAT', sequelize.col('tanggal'), '%Y-%m'), 'ASC']],
        raw: true
    });

    // Yearly (Last 5 years)
    const yearlyData = await RecordGgn.findAll({
        attributes: [
            [sequelize.fn('YEAR', sequelize.col('tanggal')), 'year'],
            [sequelize.fn('COUNT', sequelize.col('id')), 'count']
        ],
        where: {
            tanggal: { [Op.gte]: sequelize.literal("DATE_SUB(NOW(), INTERVAL 5 YEAR)") }
        },
        group: [sequelize.fn('YEAR', sequelize.col('tanggal'))],
        order: [[sequelize.fn('YEAR', sequelize.col('tanggal')), 'ASC']],
        raw: true
    });

    const chartData = {
        daily: {
            categories: dailyData.map(d => d.date),
            data: dailyData.map(d => parseInt(d.count))
        },
        monthly: {
            categories: monthlyData.map(d => d.month),
            data: monthlyData.map(d => parseInt(d.count))
        },
        yearly: {
            categories: yearlyData.map(d => String(d.year)),
            data: yearlyData.map(d => parseInt(d.count))
        }
    };

    return { stats, chartData };
}

// Redirect root to Portal
router.get('/', (req, res) => {
    res.redirect('/portal');
});

// Dashboard
router.get('/dashboard', async (req, res) => {
    try {
        const { stats, chartData } = await getDashboardStats();
        res.render('dashboard', {
            title: 'Dashboard - SIMPELL',
            stats,
            chartData
        });
    } catch (error) {
        console.error('Dashboard Error:', error);
        res.render('dashboard', {
            title: 'Dashboard - SIMPELL',
            stats: {},
            chartData: { daily: { categories: [], data: [] }, monthly: { categories: [], data: [] }, yearly: { categories: [], data: [] } },
            error_msg: 'Gagal memuat statistik dashboard'
        });
    }
});

// Portal Landing Page
router.get('/portal', (req, res) => {
    console.log('Portal Access - User Session:', req.session.user);
    res.render('portal/index', {
        title: 'Portal - POLA',
        layout: 'layouts/portal',
        user: req.session.user
    });
});

// Export Dashboard to Excel
const ExcelJS = require('exceljs');
router.get('/export-dashboard', async (req, res) => {
    try {
        const { stats, chartData } = await getDashboardStats();

        const workbook = new ExcelJS.Workbook();
        workbook.creator = 'SIMPELL System';
        workbook.created = new Date();

        // --- Sheet 1: Ringkasan Statistik ---
        const sheetSummary = workbook.addWorksheet('Ringkasan Statistik');
        sheetSummary.columns = [
            { header: 'Kategori', key: 'category', width: 30 },
            { header: 'Item', key: 'item', width: 30 },
            { header: 'Jumlah', key: 'count', width: 15 }
        ];

        // Helper to add section header
        const addSectionHeader = (title) => {
            const row = sheetSummary.addRow([title, '', '']);
            row.font = { bold: true, size: 12 };
            row.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE0E0E0' } };
        };

        // Populate Data
        addSectionHeader('Pelanggan');
        sheetSummary.addRow({ category: 'Pelanggan', item: 'Total Customer', count: stats.pelanggan_total });
        sheetSummary.addRow({ category: 'Pelanggan', item: 'Active', count: stats.pelanggan_active });
        sheetSummary.addRow({ category: 'Pelanggan', item: 'Inactive', count: stats.pelanggan_inactive });
        sheetSummary.addRow({ category: 'Pelanggan', item: 'Suspended', count: stats.pelanggan_suspended });

        addSectionHeader('Data FO');
        sheetSummary.addRow({ category: 'Data FO', item: 'Core Lamda', count: stats.core_lamda });
        sheetSummary.addRow({ category: 'Data FO', item: 'ODC', count: stats.odc });
        sheetSummary.addRow({ category: 'Data FO', item: 'OTB (Sector)', count: stats.otb_phd });
        sheetSummary.addRow({ category: 'Data FO', item: 'Data Core', count: stats.data_core });

        addSectionHeader('Akses Network');
        sheetSummary.addRow({ category: 'Akses Network', item: 'Akses FO (Node)', count: stats.akses_fo });
        sheetSummary.addRow({ category: 'Akses Network', item: 'Akses FO P2P (Node)', count: stats.akses_fo_p2p });
        sheetSummary.addRow({ category: 'Akses Network', item: 'Akses Direct LAN (Node)', count: stats.akses_direct_lan });
        sheetSummary.addRow({ category: 'Akses Network', item: 'VSAT Starlink', count: stats.starlink });
        sheetSummary.addRow({ category: 'Akses Network', item: 'M2M', count: stats.m2m });
        sheetSummary.addRow({ category: 'Akses Network', item: 'SOLTEM', count: stats.soltem });
        sheetSummary.addRow({ category: 'Akses Network', item: 'VSAT TDMA', count: stats.tdma });
        sheetSummary.addRow({ category: 'Akses Network', item: 'Radio Link (AP)', count: stats.radio_link_ap });
        sheetSummary.addRow({ category: 'Akses Network', item: '3rd Party', count: stats.third_party });
        sheetSummary.addRow({ category: 'Akses Network', item: 'CPE', count: stats.cpe });

        addSectionHeader('Infrastruktur');
        sheetSummary.addRow({ category: 'Infrastruktur', item: 'Aset FO', count: stats.aset_fo });
        sheetSummary.addRow({ category: 'Infrastruktur', item: 'Data HH', count: stats.data_hh });
        sheetSummary.addRow({ category: 'Infrastruktur', item: 'Data Closure', count: stats.data_closure });
        sheetSummary.addRow({ category: 'Infrastruktur', item: 'Data ODP', count: stats.data_odp });

        addSectionHeader('Pending GGN & PM');
        sheetSummary.addRow({ category: 'Pending GGN', item: 'Total', count: stats.pending_ggn.total });
        sheetSummary.addRow({ category: 'Pending GGN', item: 'Status Pending', count: stats.pending_ggn.pending });
        sheetSummary.addRow({ category: 'Pending GGN', item: 'Status Progress', count: stats.pending_ggn.progress });
        sheetSummary.addRow({ category: 'Pending GGN', item: 'Status Done', count: stats.pending_ggn.done });
        sheetSummary.addRow({ category: 'Pending GGN', item: 'Status Cancelled', count: stats.pending_ggn.cancelled });

        addSectionHeader('Record GGN');
        sheetSummary.addRow({ category: 'Record GGN', item: 'Bulan Ini', count: stats.record_ggn });
        sheetSummary.addRow({ category: 'Record GGN', item: 'Total Keseluruhan', count: stats.record_ggn_total });


        // --- Sheet 2: Data Grafik ---
        const sheetChart = workbook.addWorksheet('Data Grafik');
        sheetChart.columns = [
            { header: 'Periode', key: 'period', width: 20 },
            { header: 'Jumlah', key: 'count', width: 15 }
        ];

        const addChartHeader = (title) => {
            const row = sheetChart.addRow([title, '']);
            row.font = { bold: true, color: { argb: 'FFFFFFFF' } };
            row.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF2563EB' } }; // Blue
        };

        addChartHeader('Grafik Harian (30 Hari Terakhir)');
        chartData.daily.categories.forEach((date, i) => {
            sheetChart.addRow({ period: date, count: chartData.daily.data[i] });
        });

        sheetChart.addRow(['', '']);
        addChartHeader('Grafik Bulanan (12 Bulan Terakhir)');
        chartData.monthly.categories.forEach((month, i) => {
            sheetChart.addRow({ period: month, count: chartData.monthly.data[i] });
        });

        sheetChart.addRow(['', '']);
        addChartHeader('Grafik Tahunan (5 Tahun Terakhir)');
        chartData.yearly.categories.forEach((year, i) => {
            sheetChart.addRow({ period: year, count: chartData.yearly.data[i] });
        });


        // Response
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', 'attachment; filename=' + 'Dashboard_Stats_' + Date.now() + '.xlsx');

        await workbook.xlsx.write(res);
        res.end();

    } catch (error) {
        console.error('Export Error:', error);
        req.flash('error_msg', 'Gagal membaut file Excel');
        res.redirect('/');
    }
});

router.use('/cpe', require('./cpe'));
router.use('/radio-link', require('./radio-link'));

module.exports = router;
