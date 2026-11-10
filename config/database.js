const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const { Sequelize } = require('sequelize');

const dbName = process.env.DB_NAME;
const dbUser = process.env.DB_USER;
const dbPass = process.env.DB_PASSWORD;
const dbHost = process.env.DB_HOST;
const dbPort = process.env.DB_PORT || 3306;

if (!dbName || !dbUser || !dbPass || !dbHost) {
    throw new Error('DB_NAME, DB_USER, DB_PASSWORD, dan DB_HOST wajib diisi di file .env');
}

const sequelize = new Sequelize(dbName, dbUser, dbPass, {
    host: dbHost,
    port: dbPort,
    dialect: 'mysql',
    logging: false,
    pool: {
        max: 10,         // Naikkan untuk handle concurrent requests
        min: 2,          // Jaga minimal 2 koneksi tetap hidup (hindari cold start)
        acquire: 60000,  // 60 detik untuk dapat koneksi (shared hosting bisa lambat)
        idle: 30000,     // 30 detik sebelum idle connection ditutup
        evict: 10000     // Cek & buang koneksi rusak setiap 10 detik
    },
    dialectOptions: {
        connectTimeout: 60000,   // 60 detik timeout koneksi awal
        // Keep-alive agar koneksi tidak mati di shared hosting
        supportBigNumbers: true,
        bigNumberStrings: true
    },
    retry: {
        max: 3  // Auto retry sampai 3x jika koneksi gagal
    },
    timezone: '+07:00',
    define: {
        timestamps: true,
        underscored: true,
        freezeTableName: true
    }
});

module.exports = sequelize;
