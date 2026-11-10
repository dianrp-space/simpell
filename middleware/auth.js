const isAuthenticated = (req, res, next) => {
    if (req.session && req.session.user) {
        // Mitra is now allowed to be authenticated (to access Portal)
        return next();
    }
    req.flash('error_msg', 'Silakan login terlebih dahulu');
    res.redirect('/auth/login');
};

// Check if user is staff (admin, manager, or karyawan)
const isStaff = (req, res, next) => {
    if (req.session && req.session.user) {
        const role = req.session.user.role;
        if (['admin', 'manager', 'karyawan', 'mitra'].includes(role)) {
            return next();
        }
        return res.redirect('/portal?error_msg=Akun tidak memiliki akses ke sistem ini');
    }
    res.redirect('/auth/login');
};

// Check if user is admin
const isAdmin = (req, res, next) => {
    if (req.session && req.session.user && req.session.user.role === 'admin') {
        return next();
    }
    req.flash('error_msg', 'Akses ditolak. Anda tidak memiliki izin');
    res.redirect('/');
};

// Check if user is editor (Admin OR sub_user editor)
const isEditor = (req, res, next) => {
    if (req.session && req.session.user) {
        if (req.session.user.role === 'admin' || req.session.user.sub_user === 'editor') {
            return next();
        }
    }
    req.flash('error_msg', 'Akses ditolak. Anda tidak memiliki izin untuk mengubah data');
    res.redirect(req.get('Referer') || '/');
};

// Redirect if already logged in
const isGuest = (req, res, next) => {
    if (req.session && req.session.user) {
        return res.redirect('/');
    }
    next();
};

module.exports = {
    isAuthenticated,
    isStaff,
    isAdmin,
    isEditor,
    isGuest
};
