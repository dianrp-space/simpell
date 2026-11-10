const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const RecordGgn = sequelize.define('RecordGgn', {
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

    history_kontak_pic: {
        type: DataTypes.TEXT,
        allowNull: true
    },
    rfo: {
        type: DataTypes.TEXT,
        allowNull: true,
        comment: 'Reason For Outage'
    },
    akses: {
        type: DataTypes.STRING(50),
        allowNull: true
    },
    status: {
        type: DataTypes.ENUM('Pending', 'Progress', 'Done', 'Cancelled'),
        allowNull: false,
        defaultValue: 'Done'
    },
    pj: {
        type: DataTypes.STRING(100),
        allowNull: true
    },
    durasi_progress: {
        type: DataTypes.STRING(50),
        allowNull: true,
        comment: 'Duration of progress'
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
    tableName: 'record_ggn',
    timestamps: true
});

module.exports = RecordGgn;
