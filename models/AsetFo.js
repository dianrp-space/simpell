const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const AsetFo = sequelize.define('AsetFo', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    nama_node: {
        type: DataTypes.STRING(255),
        allowNull: false
    },
    kota: {
        type: DataTypes.STRING(100),
        allowNull: true
    },
    node: {
        type: DataTypes.STRING(50),
        allowNull: true,
        comment: 'Node code'
    },
    splitter_odp: {
        type: DataTypes.STRING(100),
        allowNull: true
    },
    jumlah_si_ont: {
        type: DataTypes.INTEGER,
        allowNull: true,
        defaultValue: 0
    },
    jumlah_si_p2p: {
        type: DataTypes.INTEGER,
        allowNull: true,
        defaultValue: 0
    },
    jumlah_hh: {
        type: DataTypes.INTEGER,
        allowNull: true,
        defaultValue: 0
    },
    panjang_backbone: {
        type: DataTypes.INTEGER,
        allowNull: true,
        comment: 'Length in meters'
    },
    panjang_lastmile: {
        type: DataTypes.INTEGER,
        allowNull: true,
        comment: 'Length in meters'
    },
    jumlah_tiang: {
        type: DataTypes.INTEGER,
        allowNull: true,
        defaultValue: 0
    }
}, {
    tableName: 'aset_fo',
    timestamps: true
});

module.exports = AsetFo;
