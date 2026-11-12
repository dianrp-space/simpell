const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const QcPsb = sequelize.define('QcPsb', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    tanggal: {
        type: DataTypes.DATEONLY,
        allowNull: false
    },
    notik: {
        type: DataTypes.STRING(100),
        allowNull: true
    },
    nojar: {
        type: DataTypes.STRING(100),
        allowNull: true
    },
    qc_ke: {
        type: DataTypes.STRING(50),
        allowNull: true
    },
    jenis: {
        type: DataTypes.STRING(100),
        allowNull: true
    },
    customer: {
        type: DataTypes.TEXT,
        allowNull: true
    },
    akses: {
        type: DataTypes.STRING(100),
        allowNull: true
    },
    pj: {
        type: DataTypes.STRING(100),
        allowNull: true
    },
    status: {
        type: DataTypes.STRING(50),
        allowNull: false,
        defaultValue: 'Pending'
    },
    keterangan: {
        type: DataTypes.TEXT,
        allowNull: true
    }
}, {
    tableName: 'qc_psb',
    timestamps: true
});

module.exports = QcPsb;
