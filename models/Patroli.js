const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Patroli = sequelize.define('Patroli', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    tanggal: {
        type: DataTypes.DATEONLY,
        allowNull: false
    },
    waktu_mulai: {
        type: DataTypes.TIME,
        allowNull: true
    },
    waktu_selesai: {
        type: DataTypes.TIME,
        allowNull: true
    },
    lokasi: {
        type: DataTypes.STRING,
        allowNull: true
    },
    rincian: {
        type: DataTypes.TEXT,
        allowNull: true
    },
    pj: {
        type: DataTypes.STRING,
        allowNull: true
    },
    keterangan: {
        type: DataTypes.TEXT,
        allowNull: true
    }
}, {
    tableName: 'patroli',
    timestamps: true
});

module.exports = Patroli;
