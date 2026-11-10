const { User, PasswordResetRequest } = require('../models');
const { parseMenuSelection } = require('../utils/menus');
const bcrypt = require('bcryptjs');
const logActivity = require('../utils/activityLogger');
const { Op } = require('sequelize');
const { sendApprovalEmail, sendResetSuccessEmail } = require('../utils/emailSender');
const { markReadBySource } = require('../utils/adminNotifications');
const crypto = require('crypto');

// Helper: Generate random password
const generateRandomPassword = (length = 10) => {
    const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*';
    return Array.from(crypto.randomBytes(length))
        .map((x) => chars[x % chars.length])
        .join('');
};

// Helper: Get user list
exports.index = async (req, res) => {
    try {
        const { q, role, sub_role, status } = req.query;

        // Fetch pending users
        const pendingUsers = await User.findAll({
            where: {
                is_verified: false,
                is_active: false
            }
        });

        // Fetch Password Reset Requests
        const resetRequests = await PasswordResetRequest.findAll({
            where: { status: 'pending' },
            include: [{ model: User, as: 'user' }]
        });

        // Build where clause for Active Users
        const activeWhere = {
            is_verified: true
        };

        if (q) {
            activeWhere[Op.or] = [
                { nama: { [Op.like]: `%${q}%` } },
                { email: { [Op.like]: `%${q}%` } }
            ];
        }

        if (role && role !== '') {
            activeWhere.role = role;
        }

        if (sub_role && sub_role !== '') {
            activeWhere.sub_user = sub_role;
        }

        if (status && status !== '') {
            activeWhere.is_active = status === 'active';
        }

        const activeUsers = await User.findAll({
            where: activeWhere,
            order: [['nama', 'ASC']]
        });

        res.render('admin/user-management/index', {
            title: 'Management User - POLA',
            layout: 'layouts/main',
            pendingUsers,
            resetRequests,
            activeUsers: activeUsers.map(u => u.toJSON()),
            filters: { q, role, sub_role, status },
            success_msg: req.flash('success_msg'),
            error_msg: req.flash('error_msg'),
            sidebar: false,
            header: false
        });

    } catch (error) {
        console.error('User Management Index Error:', error);
        req.flash('error_msg', 'Gagal memuat data user');
        res.redirect('/portal');
    }
};

// Approve User
exports.approveUser = async (req, res) => {
    const { id } = req.params;
    const { role, sub_user } = req.body;

    try {
        const user = await User.findByPk(id);
        if (!user) {
            req.flash('error_msg', 'User tidak ditemukan');
            return res.redirect('/admin/users');
        }

        user.is_verified = true;
        user.is_active = true;

        let finalRole = role || user.role;
        let finalSubUser = sub_user || user.sub_user;

        // Enforce: Mitra = viewer, Admin = editor
        if (finalRole === 'mitra') {
            finalSubUser = 'viewer';
        } else if (finalRole === 'admin') {
            finalSubUser = 'editor';
        }

        user.role = finalRole;
        user.sub_user = finalSubUser;
        user.allowed_menus = parseMenuSelection(req.body, finalRole);
        await user.save();
        await markReadBySource('account:' + user.id);

        await logActivity(req, 'APPROVE_USER', `Approved user ${user.nama}`, 'user', user.id);

        // Send Approval Email
        const emailSent = await sendApprovalEmail(user.email, user.nama);
        if (emailSent) {
            req.flash('success_msg', 'User berhasil disetujui dan email notifikasi terkirim.');
        } else {
            req.flash('success_msg', 'User berhasil disetujui, namun gagal mengirim email notifikasi (cek log).');
        }

        res.redirect('/admin/users?tab=accounts');

    } catch (error) {
        console.error('Approve User Error:', error);
        req.flash('error_msg', 'Terjadi kesalahan saat approve user');
        res.redirect('/admin/users?tab=accounts');
    }
};

// Reset Password
exports.resetPassword = async (req, res) => {
    const { id } = req.params;
    const { new_password } = req.body;

    try {
        const user = await User.findByPk(id);
        if (!user) {
            req.flash('error_msg', 'User tidak ditemukan');
            return res.redirect('/admin/users');
        }

        user.password = new_password;
        await user.save();

        await logActivity(req, 'RESET_PASSWORD', `Reset password for ${user.nama}`, 'user', user.id);
        req.flash('success_msg', `Password ${user.nama} berhasil direset.`);
        res.redirect('/admin/users?tab=accounts');

    } catch (error) {
        console.error('Reset Password Error:', error);
        req.flash('error_msg', 'Gagal reset password');
        res.redirect('/admin/users?tab=accounts');
    }
};

// Edit Role
exports.editRole = async (req, res) => {
    const { id } = req.params;
    const { role, sub_user, is_active } = req.body;

    try {
        const user = await User.findByPk(id);
        if (!user) return res.redirect('/admin/users');

        let finalSubUser = sub_user;
        if (role === 'mitra') finalSubUser = 'viewer';
        else if (role === 'admin') finalSubUser = 'editor';

        user.role = role;
        user.sub_user = finalSubUser;
        user.is_active = is_active === '1';
        user.allowed_menus = parseMenuSelection(req.body, role);
        await user.save();

        await logActivity(req, 'EDIT_ROLE', `Updated role for ${user.nama}`, 'user', user.id);
        req.flash('success_msg', `Role ${user.nama} berhasil diupdate.`);
        res.redirect('/admin/users?tab=accounts');

    } catch (error) {
        console.error('Edit Role Error:', error);
        req.flash('error_msg', 'Gagal edit role');
        res.redirect('/admin/users?tab=accounts');
    }
};

// Create User (Manual by Admin)
exports.createUser = async (req, res) => {
    const { nama, email, password, role, sub_user } = req.body;

    try {
        // Check exist
        const exist = await User.findOne({ where: { email } });
        if (exist) {
            req.flash('error_msg', 'Email sudah ada');
            return res.redirect('/admin/users');
        }

        // Enforce: Mitra = viewer, Admin = editor
        let finalSubUser = sub_user;
        if (role === 'mitra') finalSubUser = 'viewer';
        else if (role === 'admin') finalSubUser = 'editor';

        const user = await User.create({
            nama, email, password, role, sub_user: finalSubUser,
            is_verified: true, is_active: true,
            allowed_menus: parseMenuSelection(req.body, role)
        });

        await logActivity(req, 'CREATE_USER', `Created user ${nama}`, 'user', user.id);
        req.flash('success_msg', 'User baru berhasil dibuat.');
        res.redirect('/admin/users?tab=accounts');

    } catch (error) {
        console.error('Create User Error:', error);
        req.flash('error_msg', 'Gagal membuat user');
        res.redirect('/admin/users?tab=accounts');
    }
};

// Approve Reset Password Request
exports.approveResetPassword = async (req, res) => {
    const { id } = req.params;

    try {
        const resetRequest = await PasswordResetRequest.findByPk(id, {
            include: [{ model: User, as: 'user' }]
        });

        if (!resetRequest) {
            req.flash('error_msg', 'Request tidak ditemukan');
            return res.redirect('/admin/users?tab=resets');
        }

        const user = resetRequest.user;
        const newPassword = generateRandomPassword(10);

        user.password = newPassword;
        await user.save();

        // Mark request as completed
        resetRequest.status = 'completed';
        await resetRequest.save();
        await markReadBySource('reset:' + resetRequest.id);

        await logActivity(req, 'APPROVE_RESET_PASSWORD', `Admin approved password reset for ${user.nama}`, 'user', user.id);

        // Send Email
        const emailSent = await sendResetSuccessEmail(user.email, user.nama, newPassword);

        if (emailSent) {
            req.flash('success_msg', `Password ${user.nama} berhasil direset dan email notifikasi terkirim.`);
        } else {
            req.flash('success_msg', `Password ${user.nama} berhasil direset, namun gagal mengirim email.`);
        }

        res.redirect('/admin/users?tab=resets');

    } catch (error) {
        console.error('Approve Reset Password Error:', error);
        req.flash('error_msg', 'Terjadi kesalahan saat approve reset password');
        res.redirect('/admin/users?tab=resets');
    }
};
