const User = require('../models/User');

async function ensureAdmin() {
    const email = process.env.ADMIN_EMAIL || 'admin@simpell.local';
    const password = process.env.ADMIN_PASSWORD || 'Admin123_';
    const nama = process.env.ADMIN_NAME || 'Admin';

    const existingAdmin = await User.findOne({ where: { role: 'admin' } });
    if (existingAdmin) return;

    const existingEmail = await User.findOne({ where: { email } });
    if (existingEmail) {
        console.log(`✓ Lewati admin default: ${email} sudah terdaftar`);
        return;
    }

    await User.create({
        nama,
        email,
        password,
        role: 'admin',
        sub_user: 'editor',
        is_verified: true,
        is_active: true
    });

    console.log(`✓ Admin default dibuat: ${email}`);
}

module.exports = ensureAdmin;
