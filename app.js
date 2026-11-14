const fs = require('fs');
const path = require('path');

// Fungsi log darurat jika aplikasi gagal sebelum sempat menyala
const logHostingError = (error) => {
    const logMsg = `[${new Date().toLocaleString()}] STARTUP_ERROR: ${error.message}\n${error.stack}\n`;
    fs.appendFileSync('hosting_fatal.log', logMsg);
    console.error(logMsg);
};

try {
    // Paksa pembacaan .env menggunakan path absolut
    require('dotenv').config({ path: path.join(__dirname, '.env') });
    const express = require('express');
    const expressLayouts = require('express-ejs-layouts');
    const session = require('express-session');
    const flash = require('connect-flash');
    const methodOverride = require('method-override');
    const moment = require('moment');
    const http = require('http');
    const socketIo = require('socket.io');
    const cookie = require('cookie');
    const signature = require('cookie-signature');

    // Import database & models
    const { sequelize, User } = require('./models');
    const DbSessionStore = require('./utils/sessionStore');
    const ensureSchema = require('./utils/ensureSchema');
    const ensureAdmin = require('./utils/ensureAdmin');
    const { backfillAdminNotifications } = require('./utils/adminNotifications');
    const { MENUS, matchMenu, isOpenPath, normalizeMenus } = require('./utils/menus');

    // Import middleware
    const { isAuthenticated, isStaff } = require('./middleware/auth');

    // Import routes
    const authRoutes = require('./routes/auth');
    const indexRoutes = require('./routes/index');
    const coreLamdaRoutes = require('./routes/core-lamda');
    const odcRoutes = require('./routes/odc');
    const aksesFoRoutes = require('./routes/akses-fo');
    const aksesVsatStarlinkRoutes = require('./routes/akses-vsat-starlink');
    const aksesM2mRoutes = require('./routes/akses-m2m');
    const aksesVsatTdmaRoutes = require('./routes/akses-vsat-tdma');
    const asetFoRoutes = require('./routes/aset-fo');
    const pendingGgnRoutes = require('./routes/pending-ggn');
    const recordGgnRoutes = require('./routes/record-ggn');
    const dataHhRoutes = require('./routes/data-hh');
    const dataClosureRoutes = require('./routes/data-closure');
    const dataOdpRoutes = require('./routes/data-odp');
    const aksesThirdPartyRoutes = require('./routes/akses-third-party');
    const { createFiberCoreRouter } = require('./routes/fiber-core');
    const { OtbCentral, OtbPhd, CoreProjectCentral, CoreProjectCore, CoreProjectColumn } = require('./models');
    const otbPhdRoutes = createFiberCoreRouter({
        Central: OtbCentral,
        Core: OtbPhd,
        base: '/otb-phd',
        label: {
            listTitle: 'OTB Central - SIMPELL',
            indexTitle: 'OTB Central',
            indexSubtitle: 'Manajemen Lokasi OTB PHD',
            short: 'OTB PHD',
            file: 'OTB_Full',
            createCentralTitle: 'Tambah Central OTB - SIMPELL',
            createSectorTitle: 'Tambah Sector OTB PHD - SIMPELL',
            editSectorTitle: 'Edit Sector OTB PHD - SIMPELL',
            editCoreTitle: 'Edit Core OTB PHD - SIMPELL'
        }
    });
    const dataCoreProjectRoutes = createFiberCoreRouter({
        Central: CoreProjectCentral,
        Core: CoreProjectCore,
        Column: CoreProjectColumn,
        base: '/data-core-project',
        label: {
            listTitle: 'Data Core Project - SIMPELL',
            indexTitle: 'Data Core Project',
            indexSubtitle: 'Manajemen Data Core Project',
            short: 'Data Core Project',
            file: 'Data_Core_Project',
            createCentralTitle: 'Tambah Central - SIMPELL',
            createSectorTitle: 'Tambah Sector - SIMPELL',
            editSectorTitle: 'Edit Sector - SIMPELL',
            editCoreTitle: 'Edit Core - SIMPELL'
        }
    });
    const dataCoreRoutes = require('./routes/data-core');
    const profileRoutes = require('./routes/profile');
    const pelangganRoutes = require('./routes/pelanggan');
    const activityLogRoutes = require('./routes/activity-log');
    const changelogRoutes = require('./routes/changelog');
    const modulKosongRoutes = require('./routes/modul-kosong');
    const qcPsbRoutes = require('./routes/qc-psb');
    const msFoRoutes = require('./routes/ms-fo');
    const pendingMsFoRoutes = require('./routes/pending-ms-fo');
    const pmMsFoRoutes = require('./routes/pm-ms-fo');
    const importQcPsbIfEmpty = require('./utils/importQcPsb');
    const importMsFoIfEmpty = require('./utils/importMsFo');
    const importSpliterIfEmpty = require('./utils/importSpliter');
    const dataSpliterRoutes = require('./routes/data-spliter');

    const app = express();
    const server = http.createServer(app);
    const io = socketIo(server);

    global.io = io;

    const PORT = process.env.PORT || 3000;

    // PENTING: Trust proxy agar session berjalan di belakang reverse proxy cPanel
    app.set('trust proxy', 1);

    // View engine setup
    app.set('view engine', 'ejs');
    app.set('views', path.join(__dirname, 'views'));
    app.use(expressLayouts);
    app.set('layout', 'layouts/main');

    // Middleware
    app.use(express.json());
    app.use(express.urlencoded({ extended: true }));
    app.use(methodOverride('_method'));
    app.use(express.static(path.join(__dirname, 'public')));

    const sessionStore = new DbSessionStore(sequelize);
    const sessionSecret = process.env.SESSION_SECRET || 'simpell_secret_key';

    // Session configuration
    app.use(session({
        store: sessionStore,
        secret: sessionSecret,
        name: 'simpell.sid',
        resave: false,
        rolling: true,
        saveUninitialized: false,
        proxy: true, // Tell session it's behind a proxy
        cookie: {
            secure: false, // Set false for now
            httpOnly: true,
            sameSite: 'lax',
            maxAge: 12 * 60 * 60 * 1000
        }
    }));

    io.use((socket, next) => {
        const header = socket.handshake.headers.cookie || '';
        const cookies = cookie.parse(header);
        let raw = cookies['simpell.sid'];
        if (raw && raw.startsWith('s:')) raw = raw.slice(2);
        const sid = raw ? signature.unsign(raw, sessionSecret) : false;
        if (!sid) return next();
        sessionStore.get(sid, (err, sess) => {
            if (!err && sess && sess.user && sess.user.role === 'admin') {
                socket.join('admins');
            }
            next();
        });
    });

    // Flash messages
    app.use(flash());

    // Global variables
    app.use((req, res, next) => {
        // Prevent browser from caching dynamic pages — ensures fresh data after redirects
        res.set('Cache-Control', 'no-store, no-cache, must-revalidate, private');
        res.set('Pragma', 'no-cache');
        res.set('Expires', '0');

        res.locals.success_msg = req.flash('success_msg');
        res.locals.error_msg = req.flash('error_msg');
        res.locals.moment = moment;
        res.locals.currentPath = req.path;
        const configuredOrigin = (process.env.APP_URL || '').trim().replace(/\/$/, '');
        const originIsLocal = !configuredOrigin || /localhost|127\.0\.0\.1/i.test(configuredOrigin);
        const shareOrigin = originIsLocal ? `${req.protocol}://${req.get('host')}` : configuredOrigin;
        res.locals.shareUrl = shareOrigin + req.path;
        res.locals.shareImage = `${shareOrigin}/img/share-simpell.jpg`;
        res.locals.user = req.session.user || null;
        res.locals.isEditor = req.session.user ? (req.session.user.role === 'admin' || req.session.user.sub_user === 'editor') : false;
        res.locals.isAdmin = req.session.user ? req.session.user.role === 'admin' : false;
        res.locals.formatText = (text) => {
            return (text || '').split('\n')
                .map(l => l.trim()
                    .replace(/&/g, '&amp;')
                    .replace(/</g, '&lt;')
                    .replace(/>/g, '&gt;')
                ).join('<br>') || '-';
        };
        next();
    });

    app.use(async (req, res, next) => {
        res.locals.menuCatalog = MENUS;
        const sessionUser = req.session.user;
        if (!sessionUser) {
            res.locals.allowedMenus = [];
            res.locals.canSeeMenu = () => false;
            res.locals.canSeeGroup = () => false;
            res.locals.firstAllowedPath = '/auth/login';
            return next();
        }
        if (sessionUser.role !== 'mitra') {
            res.locals.allowedMenus = null;
            res.locals.canSeeMenu = () => true;
            res.locals.canSeeGroup = () => true;
            res.locals.firstAllowedPath = '/dashboard';
            return next();
        }
        try {
            const fresh = await User.findByPk(sessionUser.id, {
                attributes: ['allowed_menus', 'is_active', 'role']
            });
            if (!fresh || !fresh.is_active || fresh.role !== 'mitra') {
                return req.session.destroy(() => res.redirect('/auth/login'));
            }
            const allowed = normalizeMenus(fresh.allowed_menus);
            req.session.user.allowed_menus = allowed;
            res.locals.allowedMenus = allowed;
            res.locals.canSeeMenu = (key) => allowed.includes(key);
            res.locals.canSeeGroup = (keys) => keys.some((key) => allowed.includes(key));
            const first = MENUS.find((menu) => allowed.includes(menu.key));
            res.locals.firstAllowedPath = first ? first.prefix : '/portal';
            if (isOpenPath(req.path)) return next();
            const menu = matchMenu(req.path);
            if (menu && allowed.includes(menu.key)) return next();
            req.flash('error_msg', 'Menu ini tidak dibuka untuk akun Mitra');
            return res.redirect(res.locals.firstAllowedPath);
        } catch (error) {
            return next(error);
        }
    });

    // Routes
    app.use('/auth', authRoutes);
    app.use('/', isAuthenticated, indexRoutes);
    app.use('/profile', isAuthenticated, profileRoutes);

    // Restricted to staff
    app.use('/dashboard', isStaff, (req, res, next) => next()); // Explicit check for dashboard
    app.use('/core-lamda', isStaff, coreLamdaRoutes);
    app.use('/odc', isStaff, odcRoutes);
    app.use('/akses-fo-p2p', isStaff, aksesFoRoutes);
    app.use('/akses-direct-lan', isStaff, aksesFoRoutes);
    app.use('/akses-fo-xconnect', isStaff, aksesFoRoutes);
    app.use('/akses-fo', isStaff, aksesFoRoutes);
    app.use('/qc-psb', isStaff, qcPsbRoutes);
    app.use('/ms-fo', isStaff, msFoRoutes);
    app.use('/pending-ms-fo', isStaff, pendingMsFoRoutes);
    app.use('/pm-ms-fo', isStaff, pmMsFoRoutes);
    app.use('/data-spliter', isStaff, dataSpliterRoutes);
    app.use('/data-core-remote', isStaff, modulKosongRoutes);
    app.use('/data-core-trunk', isStaff, modulKosongRoutes);
    app.use('/akses-vsat-starlink', isStaff, aksesVsatStarlinkRoutes);
    app.use('/akses-soltem', isStaff, aksesM2mRoutes);
    app.use('/akses-m2m', isStaff, aksesM2mRoutes);
    app.use('/akses-vsat-tdma', isStaff, aksesVsatTdmaRoutes);
    app.use('/aset-fo', isStaff, asetFoRoutes);
    app.use('/pending-ggn', isStaff, pendingGgnRoutes);
    app.use('/record-ggn', isStaff, recordGgnRoutes);
    app.use('/data-hh', isStaff, dataHhRoutes);
    app.use('/data-closure', isStaff, dataClosureRoutes);
    app.use('/data-odp', isStaff, dataOdpRoutes);
    app.use('/akses-third-party', isStaff, aksesThirdPartyRoutes);

    app.use('/otb-phd', isStaff, otbPhdRoutes);
    app.use('/data-core-project', isStaff, dataCoreProjectRoutes);
    app.use('/data-core', isStaff, dataCoreRoutes);
    app.use('/pelanggan', isStaff, pelangganRoutes);
    app.use('/patroli', isStaff, require('./routes/patroli'));
    app.use('/activity-log', isStaff, activityLogRoutes);
    app.use('/changelog', isStaff, changelogRoutes);
    app.use('/admin/users', isStaff, require('./routes/user-management'));
    app.use('/admin/backup', isAuthenticated, require('./routes/backup'));
    app.use('/admin/notifications', isAuthenticated, require('./routes/notifications'));

    // 404 handler
    app.use((req, res) => {
        res.status(404).render('errors/404', {
            title: '404 - Page Not Found',
            layout: 'layouts/main'
        });
    });

    // Error handler
    app.use((err, req, res, next) => {
        console.error(err.stack);
        res.status(500).render('errors/500', {
            title: '500 - Server Error',
            error: {},
            layout: 'layouts/main'
        });
    });

    // Start server - Hosting Friendly Version
    const startServer = async () => {
        try {
            // 1. Tes Koneksi Database
            await sequelize.authenticate();
            // 2. Sinkronisasi Tabel
            await sequelize.sync();
            await ensureSchema(sequelize);
            await importQcPsbIfEmpty();
            const msFoImport = await importMsFoIfEmpty();
            if (msFoImport.msFo || msFoImport.pending || msFoImport.pm) {
                console.log(`Imported DATA MS FO KEPRI ${msFoImport.msFo}, PENDINGAN MS FO KEPRI ${msFoImport.pending}, DATA PM MS FO KEPRI ${msFoImport.pm}`);
            }
            const spliterImport = await importSpliterIfEmpty();
            if (spliterImport) console.log(`Imported DATA SPLITTER ${spliterImport}`);
            await backfillAdminNotifications();
            await ensureAdmin();
            // 3. Jalankan Server
            server.listen(PORT, () => {
                console.log(`✓ SIMPELL live on port ${PORT}`);
            });

        } catch (error) {
            logHostingError(error);
        }
    };

    startServer();

} catch (globalError) {
    logHostingError(globalError);
}