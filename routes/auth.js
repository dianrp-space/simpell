const express = require('express');
const router = express.Router();
const { User } = require('../models');
const { isGuest } = require('../middleware/auth');
const logActivity = require('../utils/activityLogger');
const { notifyAdmin } = require('../utils/socketNotifier');

router.get('/ping', (req, res) => {
    if (!req.session || !req.session.user) {
        return res.status(401).json({ ok: false });
    }
    req.session.lastSeen = Date.now();
    res.json({ ok: true });
});

// GET Login page
router.get('/login', isGuest, (req, res) => {
    res.render('auth/login', {
        title: 'Login - SIMPELL',
        layout: 'layouts/auth'
    });
});

// POST Login
router.post('/login', isGuest, async (req, res) => {
    try {
        const { email, password } = req.body;

        // Find user by email
        const user = await User.findOne({ where: { email } });

        if (!user) {
            req.flash('error_msg', 'Email atau password salah');
            return res.redirect('/auth/login');
        }

        // Verify password
        const isMatch = await user.verifyPassword(password);

        if (!isMatch) {
            req.flash('error_msg', 'Email atau password salah');
            return res.redirect('/auth/login');
        }

        // Check if user is verified and active
        if (!user.is_verified) {
            req.flash('error_msg', 'Akun Anda belum diverifikasi oleh admin');
            return res.redirect('/auth/login');
        }

        if (!user.is_active) {
            req.flash('error_msg', 'Akun Anda telah dinonaktifkan. Silakan hubungi admin (polalintasarta@gmail.com).');
            return res.redirect('/auth/login');
        }

        // Set session
        req.session.user = {
            id: user.id,
            nama: user.nama,
            email: user.email,
            role: user.role,
            sub_user: user.sub_user, // Added sub_user
            allowed_menus: user.allowed_menus || [],
            foto: user.foto,
            no_hp: user.no_hp
        };

        // Explicitly save session before redirecting
        req.session.save((err) => {
            if (err) {
                console.error('Session save error:', err);
                return res.redirect('/auth/login');
            }
            req.flash('success_msg', `Selamat datang, ${user.nama}!`);
            res.redirect('/portal');
        });

        // Log activity (after save is fine)
        logActivity(req, 'LOGIN', `User ${user.nama} berhasil login`, 'user', user.id);
    } catch (error) {
        console.error('Login error:', error);
        req.flash('error_msg', 'Terjadi kesalahan saat login');
        res.redirect('/auth/login');
    }
});

// GET Register page
router.get('/register', isGuest, (req, res) => {
    res.render('auth/register', {
        title: 'Register - SIMPELL',
        layout: 'layouts/auth'
    });
});

// POST Register
router.post('/register', isGuest, async (req, res) => {
    try {
        const { nama, email, password, password_confirm, no_hp } = req.body;

        // Validation
        if (!nama || !email || !password || !no_hp) {
            req.flash('error_msg', 'Semua field harus diisi');
            return res.redirect('/auth/register');
        }

        if (password !== password_confirm) {
            req.flash('error_msg', 'Password tidak cocok');
            return res.redirect('/auth/register');
        }

        if (password.length < 6) {
            req.flash('error_msg', 'Password minimal 6 karakter');
            return res.redirect('/auth/register');
        }

        // Check if email already exists
        const existingUser = await User.findOne({ where: { email } });
        if (existingUser) {
            req.flash('error_msg', 'Email sudah terdaftar');
            return res.redirect('/auth/register');
        }

        // Create user (default role: karyawan)
        const newUser = await User.create({
            nama,
            email,
            password,
            no_hp,
            role: 'karyawan'
        });

        // Notify Admin
        notifyAdmin('new_account_request', {
            nama: newUser.nama,
            email: newUser.email,
            userId: newUser.id
        });

        req.flash('success_msg', 'Berhasil mendaftar, silahkan tunggu approval admin.');
        res.redirect('/auth/login');
    } catch (error) {
        console.error('Register error:', error);
        req.flash('error_msg', 'Terjadi kesalahan saat registrasi');
        res.redirect('/auth/register');
    }
});

// GET Logout
router.get('/logout', async (req, res) => {
    const user = req.session.user;
    if (user) {
        await logActivity(req, 'LOGOUT', `User ${user.nama} logout`, 'user', user.id);
    }

    req.session.destroy((err) => {
        if (err) {
            console.error('Logout error:', err);
        }
        res.redirect('/auth/login');
    });
});


// Forgot Password
router.get('/forgot-password', (req, res) => {
    res.render('auth/forgot-password', {
        title: 'Lupa Password - POLA',
        layout: 'layouts/auth' // Redundant flash calls removed
    });
});

const { PasswordResetRequest } = require('../models');

router.post('/forgot-password', async (req, res) => {
    const { email } = req.body;
    try {
        const user = await User.findOne({ where: { email } });
        if (!user) {
            req.flash('error_msg', 'Email tidak terdaftar');
            return res.redirect('/auth/forgot-password');
        }

        // Check if there's already a pending request
        const existingRequest = await PasswordResetRequest.findOne({
            where: { user_id: user.id, status: 'pending' }
        });

        if (existingRequest) {
            req.flash('error_msg', 'Anda sudah memiliki permintaan reset password yang sedang diproses');
            return res.redirect('/auth/forgot-password');
        }

        const resetRequest = await PasswordResetRequest.create({
            user_id: user.id,
            status: 'pending'
        });

        await logActivity(req, 'RESET_PASSWORD_REQUEST', `User ${user.nama} meminta reset password`, 'user', user.id);

        notifyAdmin('new_reset_request', {
            nama: user.nama,
            email: user.email,
            requestId: resetRequest.id
        });

        req.flash('success_msg', 'Permintaan reset password telah dikirim ke admin. Silakan tunggu konfirmasi.');
        res.redirect('/auth/forgot-password');
    } catch (error) {
        console.error('Forgot password error:', error);
        req.flash('error_msg', 'Terjadi kesalahan saat memproses permintaan');
        res.redirect('/auth/forgot-password');
    }
});

// Contact Admin
router.get('/contact-admin', (req, res) => {
    res.render('auth/contact-admin', {
        title: 'Hubungi Admin - POLA',
        layout: 'layouts/auth'
    });
});

module.exports = router;
