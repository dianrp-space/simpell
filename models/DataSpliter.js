const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const DataSpliter = sequelize.define('DataSpliter', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    urutan: {
        type: DataTypes.INTEGER,
        allowNull: true
    },
    lokasi: {
        type: DataTypes.STRING(150),
        allowNull: true
    },
    kartu: {
        type: DataTypes.STRING(150),
        allowNull: true
    },
    olt: {
        type: DataTypes.STRING(255),
        allowNull: true
    },
    tray: {
        type: DataTypes.STRING(150),
        allowNull: true
    },
    core: {
        type: DataTypes.STRING(150),
        allowNull: true
    },
    no_spliter: {
        type: DataTypes.STRING(255),
        allowNull: true
    },
    port: {
        type: DataTypes.INTEGER,
        allowNull: true
    },
    warna: {
        type: DataTypes.STRING(20),
        allowNull: true
    },
    deskripsi: {
        type: DataTypes.TEXT,
        allowNull: true
    },
    destination: {
        type: DataTypes.TEXT,
        allowNull: true
    },
    template: {
        type: DataTypes.STRING(255),
        allowNull: true
    },
    keterangan: {
        type: DataTypes.TEXT,
        allowNull: true
    }
}, {
    tableName: 'data_spliter',
    timestamps: true
});

module.exports = DataSpliter;
