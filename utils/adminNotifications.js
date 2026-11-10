const { Op } = require('sequelize');
const { AdminNotification, User, PasswordResetRequest } = require('../models');

function toItem(row) {
    return {
        id: row.id,
        event: row.event,
        title: row.title,
        message: row.message,
        link: row.link || '',
        read: Boolean(row.read_at),
        createdAt: row.createdAt
    };
}

function build(event, data) {
    const nama = data && data.nama ? String(data.nama) : '';
    const email = data && data.email ? String(data.email) : '';
    if (event === 'new_account_request') {
        return {
            event,
            title: 'Request Akun Baru',
            message: nama + ' (' + email + ') meminta akses.',
            link: '/admin/users?tab=requests',
            source_key: data && data.userId ? 'account:' + data.userId : null
        };
    }
    if (event === 'new_reset_request') {
        return {
            event,
            title: 'Request Reset Password',
            message: nama + ' meminta reset password.',
            link: '/admin/users?tab=resets',
            source_key: data && data.requestId ? 'reset:' + data.requestId : null
        };
    }
    return null;
}

async function ensure(event, data) {
    const fields = build(event, data);
    if (!fields) return { item: null, created: false };
    if (fields.source_key) {
        const [row, created] = await AdminNotification.findOrCreate({
            where: { source_key: fields.source_key },
            defaults: fields
        });
        return { item: toItem(row), created };
    }
    const row = await AdminNotification.create(fields);
    return { item: toItem(row), created: true };
}

async function listNotifications() {
    const rows = await AdminNotification.findAll({
        order: [['created_at', 'DESC']],
        limit: 30
    });
    const unread = await AdminNotification.count({ where: { read_at: { [Op.is]: null } } });
    return { items: rows.map(toItem), unread };
}

async function markRead(id) {
    await AdminNotification.update(
        { read_at: new Date() },
        { where: { id, read_at: { [Op.is]: null } } }
    );
}

async function markAllRead() {
    await AdminNotification.update(
        { read_at: new Date() },
        { where: { read_at: { [Op.is]: null } } }
    );
}

async function markReadBySource(sourceKey) {
    if (!sourceKey) return;
    await AdminNotification.update(
        { read_at: new Date() },
        { where: { source_key: sourceKey, read_at: { [Op.is]: null } } }
    );
}

async function backfillAdminNotifications() {
    const pendingUsers = await User.findAll({
        where: { is_verified: false, is_active: false },
        attributes: ['id', 'nama', 'email']
    });
    for (const user of pendingUsers) {
        await ensure('new_account_request', {
            nama: user.nama,
            email: user.email,
            userId: user.id
        });
    }

    const resets = await PasswordResetRequest.findAll({
        where: { status: 'pending' },
        include: [{ model: User, as: 'user', attributes: ['nama', 'email'] }]
    });
    for (const reset of resets) {
        if (!reset.user) continue;
        await ensure('new_reset_request', {
            nama: reset.user.nama,
            email: reset.user.email,
            requestId: reset.id
        });
    }
}

module.exports = {
    ensure,
    listNotifications,
    markRead,
    markAllRead,
    markReadBySource,
    backfillAdminNotifications
};
