const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const AksesVsatTdma = sequelize.define('AksesVsatTdma', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },


    modem: {
        type: DataTypes.STRING(100),
        allowNull: true,
        comment: 'Modem type (autocomplete from existing values)'
    },
    satelite: {
        type: DataTypes.STRING(100),
        allowNull: true,
        comment: 'Satellite type (autocomplete from existing values)'
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
    tableName: 'akses_vsat_tdma',
    timestamps: true
});

module.exports = AksesVsatTdma;
