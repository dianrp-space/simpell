const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const AksesM2m = sequelize.define('AksesM2m', {
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
    vlan: {
        type: DataTypes.STRING(100),
        allowNull: true
    },
    ip_secondary: {
        type: DataTypes.STRING(100),
        allowNull: true
    },
    detail: {
        type: DataTypes.TEXT,
        allowNull: true
    },
    layanan: {
        type: DataTypes.STRING(50),
        allowNull: true
    },
    no_gsm: {
        type: DataTypes.STRING(20),
        allowNull: true
    },
    kuota: {
        type: DataTypes.STRING(50),
        allowNull: true
    },
    slot_sim: {
        type: DataTypes.STRING(20),
        allowNull: true
    },
    pelanggan_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: {
            model: 'pelanggan',
            key: 'id'
        }
    },
    keterangan: {
        type: DataTypes.TEXT,
        allowNull: true
    }
}, {
    tableName: 'akses_m2m',
    timestamps: true
});

module.exports = AksesM2m;
