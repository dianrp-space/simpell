const express = require('express');
const fs = require('fs/promises');
const os = require('os');
const path = require('path');
const multer = require('multer');
const { isAdmin } = require('../middleware/auth');
const logActivity = require('../utils/activityLogger');
const { createBackupArchive, restoreBackupArchive } = require('../utils/backup');

const router = express.Router();
const upload = multer({
    dest: os.tmpdir(),
    limits: { fileSize: 512 * 1024 * 1024 },
    fileFilter(req, file, callback) {
        const name = (file.originalname || '').toLowerCase();
        if (name.endsWith('.tar.gz') || name.endsWith('.tgz')) callback(null, true);
        else callback(new Error('File harus berformat .tar.gz'));
    }
});

router.get('/', isAdmin, (req, res) => {
    res.render('admin/backup', {
        title: 'Backup & Restore - POLA',
        pageTitle: 'Backup & Restore',
        layout: 'layouts/main'
    });
});

router.get('/download', isAdmin, async (req, res) => {
    const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    const filename = 'simpell-backup-' + stamp + '.tar.gz';
    const dest = path.join(os.tmpdir(), filename);
    try {
        const manifest = await createBackupArchive(dest);
        await logActivity(req, 'BACKUP', 'Mengunduh cadangan ' + manifest.tables + ' tabel, ' + manifest.rows + ' baris');
        res.download(dest, filename, () => {
            fs.rm(dest, { force: true }).catch(() => {});
        });
    } catch (error) {
        console.error('Backup error:', error);
        await fs.rm(dest, { force: true }).catch(() => {});
        req.flash('error_msg', 'Gagal membuat cadangan. ' + error.message);
        res.redirect('/admin/backup');
    }
});

router.post('/restore', isAdmin, (req, res) => {
    upload.single('archive')(req, res, async (error) => {
        if (error) {
            const message = error.code === 'LIMIT_FILE_SIZE'
                ? 'File cadangan lebih besar dari 512 MB.'
                : error.message;
            req.flash('error_msg', message);
            return res.redirect('/admin/backup');
        }
        if (!req.file) {
            req.flash('error_msg', 'Pilih file cadangan .tar.gz terlebih dahulu.');
            return res.redirect('/admin/backup');
        }
        if (req.body.confirm !== 'PULIHKAN') {
            await fs.rm(req.file.path, { force: true }).catch(() => {});
            req.flash('error_msg', 'Ketik PULIHKAN untuk mengembalikan data.');
            return res.redirect('/admin/backup');
        }
        try {
            const manifest = await restoreBackupArchive(req.file.path);
            await logActivity(req, 'RESTORE', 'Memulihkan cadangan ' + (manifest.createdAt || ''));
            req.flash('success_msg', 'Data berhasil dipulihkan. Periksa kembali isinya.');
            res.redirect('/admin/backup');
        } catch (restoreError) {
            console.error('Restore error:', restoreError);
            req.flash('error_msg', 'Pemulihan gagal. Data sebelumnya dikembalikan kalau penggantian belum selesai. ' + restoreError.message);
            res.redirect('/admin/backup');
        } finally {
            if (req.file) await fs.rm(req.file.path, { force: true }).catch(() => {});
        }
    });
});

module.exports = router;
