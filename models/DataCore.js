const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

// Main Jaringan/Location record
const DataCore = sequelize.define('DataCore', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    no_jaringan: {
        type: DataTypes.STRING(100),
        allowNull: false,
        comment: 'Nomor jaringan atau ID referensi'
    },
    nama_lokasi: {
        type: DataTypes.STRING(255),
        allowNull: false,
        comment: 'Nama lokasi atau pelanggan'
    },
    longitude: {
        type: DataTypes.DECIMAL(11, 8),
        allowNull: true
    },
    latitude: {
        type: DataTypes.DECIMAL(10, 8),
        allowNull: true
    },
    waypoints: {
        type: DataTypes.TEXT,
        allowNull: true,
        comment: 'JSON array of waypoint coordinates for the cable route',
        get() {
            const value = this.getDataValue('waypoints');
            return value ? JSON.parse(value) : [];
        },
        set(value) {
            this.setDataValue('waypoints', value ? JSON.stringify(value) : null);
        }
    }
}, {
    tableName: 'data_core',
    timestamps: true
});

// Sector child records - each jaringan can have multiple sectors
const DataCoreSector = sequelize.define('DataCoreSector', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    data_core_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: 'data_core',
            key: 'id'
        }
    },
    nama_sector: {
        type: DataTypes.STRING(100),
        allowNull: false,
        comment: 'Nama sector (contoh: K48 T1 C5,C4)'
    },
    latitude: {
        type: DataTypes.DECIMAL(10, 8),
        allowNull: true,
        comment: 'Latitude koordinat sector'
    },
    longitude: {
        type: DataTypes.DECIMAL(11, 8),
        allowNull: true,
        comment: 'Longitude koordinat sector'
    },
    keterangan: {
        type: DataTypes.TEXT,
        allowNull: true,
        comment: 'Detail info tube dan core'
    }
}, {
    tableName: 'data_core_sectors',
    timestamps: true
});

// Relationships
DataCore.hasMany(DataCoreSector, { foreignKey: 'data_core_id', as: 'sectors' });
DataCoreSector.belongsTo(DataCore, { foreignKey: 'data_core_id', as: 'dataCore' });

module.exports = { DataCore, DataCoreSector };
