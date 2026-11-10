const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const PendingGgn = sequelize.define('PendingGgn', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    tanggal: {
        type: DataTypes.DATE,
        allowNull: false
    },
    case_type: {
        type: DataTypes.STRING(100),
        allowNull: true,
        comment: 'Case type (autocomplete from existing values)'
    },
    no_ticket: {
        type: DataTypes.STRING(50),
        allowNull: true
    },

    rincian: {
        type: DataTypes.TEXT,
        allowNull: true
    },
    akses: {
        type: DataTypes.STRING(50),
        allowNull: true,
        comment: 'Access type (FO, VSAT, M2M, etc.)'
    },
    pj: {
        type: DataTypes.STRING(100),
        allowNull: true,
        comment: 'Penanggung Jawab'
    },
    status: {
        type: DataTypes.ENUM('Pending', 'Progress', 'Done', 'Cancelled'),
        allowNull: false,
        defaultValue: 'Pending'
    },
    keterangan: {
        type: DataTypes.TEXT,
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
    longitude: {
        type: DataTypes.DECIMAL(11, 8),
        allowNull: true
    },
    latitude: {
        type: DataTypes.DECIMAL(10, 8),
        allowNull: true
    }
}, {
    tableName: 'pending_ggn',
    timestamps: true
});

module.exports = PendingGgn;
