const express = require('express');
const router = express.Router();

const PAGES = {
    '/data-spliter': {
        title: 'Data Spliter',
        group: 'Data FO Kepri',
        columns: ['OLT', 'Tray', 'Core', 'No Spliter', 'Description', 'Destination'],
        note: 'Sheet Excel Data Spliter tersusun per blok lokasi. Modul ini belum ada di menu sebelumnya.'
    },
    '/data-core-remote': {
        title: 'Data Core Remote',
        group: 'Data FO Kepri',
        columns: ['Judul jaringan', 'Detail core per segmen'],
        note: 'Sheet Excel Data Core Remote adalah peta core per jaringan, bukan tabel biasa. Modul Data Core yang lama tidak sama dengan sheet ini.'
    },
    '/data-core-trunk': {
        title: 'Data Core Trunk',
        group: 'Data FO Kepri',
        columns: ['Judul trunk', 'Detail core'],
        note: 'Sheet Excel Data Core Trunk adalah peta core per trunk. Modul Data Core yang lama tidak sama dengan sheet ini.'
    }
};

router.get('/', (req, res) => {
    const page = PAGES[req.baseUrl] || {
        title: 'Modul',
        group: '',
        columns: [],
        note: 'Modul ini belum tersedia.'
    };
    res.render('modul-kosong', {
        title: page.title + ' - SIMPELL',
        page
    });
});

module.exports = router;
