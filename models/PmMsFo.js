const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const PmMsFo = sequelize.define('PmMsFo', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    urutan: {
        type: DataTypes.INTEGER,
        allowNull: true
    },
    judul: {
        type: DataTypes.STRING(255),
        allowNull: true
    },
    jenis: {
        type: DataTypes.STRING(100),
        allowNull: true
    },
    periode: {
        type: DataTypes.STRING(100),
        allowNull: true
    },
    target: {
        type: DataTypes.INTEGER,
        allowNull: true
    },
    nomor: {
        type: DataTypes.INTEGER,
        allowNull: true
    },
    tanggal: {
        type: DataTypes.DATEONLY,
        allowNull: true
    },
    no_ticket: {
        type: DataTypes.STRING(100),
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
    rincian: {
        type: DataTypes.TEXT,
        allowNull: true
    }
}, {
    tableName: 'pm_ms_fo',
    timestamps: true
});

module.exports = PmMsFo;
