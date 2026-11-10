const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Pelanggan = sequelize.define('Pelanggan', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    no_jaringan: {
        type: DataTypes.STRING(100),
        allowNull: false,
        unique: true,
        comment: 'Nomor jaringan pelanggan (unique identifier)'
    },
    nama_pelanggan: {
        type: DataTypes.STRING(255),
        allowNull: false,
        comment: 'Nama lengkap pelanggan'
    },
    alamat: {
        type: DataTypes.TEXT,
        allowNull: true,
        comment: 'Alamat pelanggan'
    },
    kontak: {
        type: DataTypes.STRING(50),
        allowNull: true,
        comment: 'Nomor telepon/HP'
    },
    email: {
        type: DataTypes.STRING(255),
        allowNull: true
    },
    jenis_layanan: {
        type: DataTypes.STRING(100),
        allowNull: true,
        comment: 'Jenis layanan utama (FO, VSAT, M2M, dll)'
    },
    status: {
        type: DataTypes.ENUM('Active', 'Inactive', 'Suspended'),
        allowNull: false,
        defaultValue: 'Active'
    },
    tanggal_berlangganan: {
        type: DataTypes.DATE,
        allowNull: true,
        comment: 'Tanggal mulai berlangganan'
    },
    keterangan: {
        type: DataTypes.TEXT,
        allowNull: true
    }
}, {
    tableName: 'pelanggan',
    timestamps: true
});

module.exports = Pelanggan;
