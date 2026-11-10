const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const AksesVsatStarlink = sequelize.define('AksesVsatStarlink', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },


    sn_kit: {
        type: DataTypes.STRING(100),
        allowNull: true
    },
    sn_mikrotik: {
        type: DataTypes.STRING(100),
        allowNull: true
    },
    no_registrasi_psu: {
        type: DataTypes.STRING(100),
        allowNull: true
    },
    no_registrasi_kit: {
        type: DataTypes.STRING(100),
        allowNull: true
    },
    starlink_type: {
        type: DataTypes.STRING(100),
        allowNull: true,
        comment: 'Type of Starlink (autocomplete from existing values)'
    },
    web_prtg: {
        type: DataTypes.STRING(255),
        allowNull: true
    },
    pelanggan_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: {
            model: 'pelanggan',
            key: 'id'
        }
    }
}, {
    tableName: 'akses_vsat_starlink',
    timestamps: true
});

module.exports = AksesVsatStarlink;
