const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const DataHh = sequelize.define('DataHh', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    longitude: {
        type: DataTypes.DECIMAL(11, 8),
        allowNull: true
    },
    latitude: {
        type: DataTypes.DECIMAL(10, 8),
        allowNull: true
    },
    nama_hh: {
        type: DataTypes.STRING(255),
        allowNull: false
    },
    datek_core: {
        type: DataTypes.TEXT,
        allowNull: true
    },
    tanggal: {
        type: DataTypes.DATE,
        allowNull: true
    },
    pj: {
        type: DataTypes.STRING(100),
        allowNull: true,
        comment: 'Penanggung Jawab (Person in Charge)'
    }
}, {
    tableName: 'data_hh',
    timestamps: true
});

module.exports = DataHh;
