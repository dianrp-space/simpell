const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const PendingMsFo = sequelize.define('PendingMsFo', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    tanggal: {
        type: DataTypes.DATEONLY,
        allowNull: false
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
    tableName: 'pending_ms_fo',
    timestamps: true
});

module.exports = PendingMsFo;
