const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const MsFo = sequelize.define('MsFo', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    nomor: {
        type: DataTypes.INTEGER,
        allowNull: true
    },
    no_jaringan: {
        type: DataTypes.STRING(100),
        allowNull: true
    },
    customer: {
        type: DataTypes.STRING(255),
        allowNull: true
    },
    service: {
        type: DataTypes.STRING(100),
        allowNull: true
    },
    bandwidth: {
        type: DataTypes.STRING(50),
        allowNull: true
    },
    akses: {
        type: DataTypes.STRING(100),
        allowNull: true
    },
    node: {
        type: DataTypes.STRING(100),
        allowNull: true
    },
    status: {
        type: DataTypes.STRING(50),
        allowNull: false,
        defaultValue: 'Active'
    },
    kota: {
        type: DataTypes.STRING(100),
        allowNull: true
    },
    lat_long: {
        type: DataTypes.STRING(255),
        allowNull: true
    },
    kontak: {
        type: DataTypes.STRING(50),
        allowNull: true
    },
    email: {
        type: DataTypes.STRING(255),
        allowNull: true
    },
    alamat: {
        type: DataTypes.TEXT,
        allowNull: true
    },
    pj: {
        type: DataTypes.STRING(100),
        allowNull: true
    },
    keterangan: {
        type: DataTypes.TEXT,
        allowNull: true
    }
}, {
    tableName: 'ms_fo',
    timestamps: true
});

module.exports = MsFo;
