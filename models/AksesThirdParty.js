const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const AksesThirdParty = sequelize.define('AksesThirdParty', {
    id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true
    },

    pelanggan_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: {
            model: 'pelanggan',
            key: 'id'
        },
        onDelete: 'SET NULL'
    },
    id_segment: {
        type: DataTypes.STRING,
        allowNull: true
    },
    id_provider: {
        type: DataTypes.STRING,
        allowNull: true
    },
    nama_mitra: {
        type: DataTypes.STRING,
        allowNull: true
    },
    asal: {
        type: DataTypes.STRING,
        allowNull: true
    },
    tujuan: {
        type: DataTypes.STRING,
        allowNull: true
    },
    bandwidth: {
        type: DataTypes.STRING,
        allowNull: true
    },
    sewa_per_bulan: {
        type: DataTypes.STRING, // Using String for flexibility (e.g. "Rp 5.000.000" or just number)
        allowNull: true
    },
    tgl_online: {
        type: DataTypes.DATEONLY, // Using DATEONLY as time is likely not needed
        allowNull: true
    },
    keterangan: {
        type: DataTypes.TEXT,
        allowNull: true
    }
}, {
    tableName: 'akses_third_party',
    timestamps: true
});



module.exports = AksesThirdParty;
