const nodemailer = require('nodemailer');

function smtpConfig() {
    const user = (process.env.SMTP_USER || process.env.EMAIL_USER || '').trim();
    const pass = process.env.SMTP_PASS || process.env.EMAIL_PASS || '';
    const host = (process.env.SMTP_HOST || (user ? 'smtp.gmail.com' : '')).trim();
    if (!host || !user || !pass) return null;

    const port = Number(process.env.SMTP_PORT) || (host === 'smtp.gmail.com' ? 465 : 587);
    const flag = (process.env.SMTP_SECURE || '').trim().toLowerCase();
    const secure = flag === 'true' || flag === '1' ? true : flag === 'false' || flag === '0' ? false : port === 465;
    const fromRaw = (process.env.SMTP_FROM || user).trim();
    const from = fromRaw.includes('<') ? fromRaw : `"POLA Lintasarta Admin" <${fromRaw}>`;

    return {
        from,
        transporter: nodemailer.createTransport({
            host,
            port,
            secure,
            auth: { user, pass },
            family: 4
        })
    };
}

const sendApprovalEmail = async (userEmail, userName) => {
    const mail = smtpConfig();
    if (!mail) {
        console.warn('Email persetujuan dilewati: SMTP belum diisi.');
        return false;
    }
    try {
        const info = await mail.transporter.sendMail({
            from: mail.from,
            to: userEmail,
            subject: 'Akun POLA Anda Telah Disetujui',
            html: `
                <div style="font-family: Arial, sans-serif; padding: 20px; color: #333;">
                    <h2 style="color: #001F99;">Selamat Datang di POLA!</h2>
                    <p>Halo <strong>${userName}</strong>,</p>
                    <p>Selamat! Akun Anda untuk mengakses portal <strong>POLA (Portal Operasional Lintasarta)</strong> telah disetujui oleh admin.</p>
                    <p>Sekarang Anda dapat login dan mengakses layanan yang tersedia.</p>
                    <br>
                    <a href="${process.env.APP_URL || 'http://localhost:3002'}/auth/login" style="background-color: #001F99; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Login ke POLA</a>
                    <br><br>
                    <p>Terima kasih,<br>Tim Admin POLA</p>
                </div>
            `
        });
        console.log('Approval email sent: %s', info.messageId);
        return true;
    } catch (error) {
        console.error('Error sending approval email:', error);
        return false;
    }
};

const sendResetSuccessEmail = async (userEmail, userName, newPassword) => {
    const mail = smtpConfig();
    if (!mail) {
        console.warn('Email reset password dilewati: SMTP belum diisi.');
        return false;
    }
    try {
        const info = await mail.transporter.sendMail({
            from: mail.from,
            to: userEmail,
            subject: 'Password POLA Anda Telah Direset',
            html: `
                <div style="font-family: Arial, sans-serif; padding: 20px; color: #333;">
                    <h2 style="color: #001F99;">Password Berhasil Direset</h2>
                    <p>Halo <strong>${userName}</strong>,</p>
                    <p>Permintaan reset password Anda telah disetujui oleh admin.</p>
                    <p>Password Anda saat ini telah direset menjadi:</p>
                    <div style="background-color: #f4f4f4; padding: 10px; border-radius: 5px; font-family: monospace; font-size: 16px; margin: 15px 0;">
                        ${newPassword}
                    </div>
                    <p>Silakan login menggunakan password baru tersebut dan segera ubah password Anda di menu Pengaturan demi keamanan.</p>
                    <br>
                    <a href="${process.env.APP_URL || 'http://localhost:3002'}/auth/login" style="background-color: #001F99; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Login ke POLA</a>
                    <br><br>
                    <p>Terima kasih,<br>Tim Admin POLA</p>
                </div>
            `
        });
        console.log('Reset success email sent: %s', info.messageId);
        return true;
    } catch (error) {
        console.error('Error sending reset success email:', error);
        return false;
    }
};

module.exports = { sendApprovalEmail, sendResetSuccessEmail };
