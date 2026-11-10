const express = require('express');
const router = express.Router();
const { User } = require('../models');
const fs = require('fs');
const path = require('path');

// GET Profile page
router.get('/', (req, res) => {
    res.render('profile/index', {
        title: 'Profil - SIMPELL',
        pageTitle: 'Profil Saya',
        layout: 'layouts/minimal'
    });
});

// GET Settings page
router.get('/settings', (req, res) => {
    res.render('profile/settings', {
        title: 'Pengaturan - SIMPELL',
        pageTitle: 'Pengaturan',
        layout: 'layouts/minimal'
    });
});

// POST Change password
router.post('/password', async (req, res) => {
    try {
        const { current_password, new_password, confirm_password } = req.body;
        const userId = req.session.user.id;

        // Validation
        if (!current_password || !new_password || !confirm_password) {
            req.flash('error_msg', 'Semua field harus diisi');
            return res.redirect('/profile');
        }

        if (new_password !== confirm_password) {
            req.flash('error_msg', 'Password baru tidak cocok');
            return res.redirect('/profile');
        }

        if (new_password.length < 6) {
            req.flash('error_msg', 'Password minimal 6 karakter');
            return res.redirect('/profile');
        }

        // Get user from database
        const user = await User.findByPk(userId);
        if (!user) {
            req.flash('error_msg', 'User tidak ditemukan');
            return res.redirect('/profile');
        }

        // Verify current password
        const isMatch = await user.verifyPassword(current_password);
        if (!isMatch) {
            req.flash('error_msg', 'Password saat ini salah');
            return res.redirect('/profile');
        }

        // Update password
        user.password = new_password;
        await user.save();

        req.flash('success_msg', 'Password berhasil diubah');
        res.redirect('/profile');
    } catch (error) {
        console.error('Change password error:', error);
        req.flash('error_msg', 'Terjadi kesalahan saat mengubah password');
        res.redirect('/profile');
    }
});

const multer = require('multer');

// Configure Multer
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        const uploadDir = 'public/uploads/profiles/';
        // Ensure directory exists
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }
        cb(null, uploadDir);
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, 'profile-' + uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({
    storage: storage,
    limits: { fileSize: 100 * 1024 * 1024 }, // Set to 100MB as a safe "unlimited" value for web apps
    fileFilter: function (req, file, cb) {
        if (!file.originalname.match(/\.(jpg|jpeg|png|gif)$/)) {
            return cb(new Error('Hanya file gambar yang diperbolehkan!'), false);
        }
        cb(null, true);
    }
});

// POST Update Profile
router.post('/settings', upload.single('foto'), async (req, res) => {
    try {
        const { nama, no_hp } = req.body;
        const userId = req.session.user.id;

        // Validation
        if (!nama) {
            req.flash('error_msg', 'Nama tidak boleh kosong');
            return res.redirect('/profile');
        }

        const user = await User.findByPk(userId);
        if (!user) {
            req.flash('error_msg', 'User tidak ditemukan');
            return res.redirect('/profile');
        }

        // Update Simpell fields
        user.nama = nama;
        if (no_hp !== undefined) {
            // If empty string, set to null or empty string depending on DB preference.
            // Sequelize allow null is true for no_hp.
            user.no_hp = no_hp.trim() === '' ? null : no_hp.trim();
        }
        let newPhotoFilename = null;

        // Check if file uploaded
        if (req.file) {
            // Delete old photo if exists and not default
            if (user.foto && fs.existsSync(`public/uploads/profiles/${user.foto}`)) {
                try {
                    fs.unlinkSync(`public/uploads/profiles/${user.foto}`);
                } catch (err) {
                    console.error('Error deleting old photo:', err);
                }
            }
            user.foto = req.file.filename;
            newPhotoFilename = req.file.filename;
        }

        await user.save();

        // Update session
        req.session.user.nama = user.nama;
        req.session.user.foto = user.foto;
        req.session.user.no_hp = user.no_hp;

        req.flash('success_msg', 'Profil berhasil diperbarui');
        res.redirect('/profile');

    } catch (error) {
        console.error('Update profile error:', error);
        req.flash('error_msg', error.message || 'Terjadi kesalahan saat memperbarui profil');
        res.redirect('/profile');
    }
});

// POST Update Theme
router.post('/theme', async (req, res) => {
    try {
        const { theme } = req.body;
        const userId = req.session.user.id;

        if (!['light', 'dark', 'system'].includes(theme)) {
            return res.status(400).json({ success: false, message: 'Invalid theme' });
        }

        const user = await User.findByPk(userId);
        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        user.theme = theme;
        await user.save();

        // Update session
        req.session.user.theme = theme;

        res.json({ success: true });
    } catch (error) {
        console.error('Theme update error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

module.exports = router;
