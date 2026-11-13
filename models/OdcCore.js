const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

// FO Core colors in order (1-12)
const CORE_COLORS = [
    'Blue', 'Orange', 'Green', 'Brown', 'Gray', 'White',
    'Red', 'Black', 'Yellow', 'Purple', 'Pink', 'Aqua'
];

const OdcCore = sequelize.define('OdcCore', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    odc_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: 'odc',
            key: 'id'
        }
    },
    sector: {
        type: DataTypes.STRING(50),
        allowNull: false,
        comment: 'Sector identifier (e.g., A, B, C)'
    },
    tray: {
        type: DataTypes.INTEGER,
        allowNull: false,
        comment: 'Tray number'
    },
    core_number: {
        type: DataTypes.INTEGER,
        allowNull: false,
        comment: 'Core number (1-12, 1-24, etc.)'
    },
    tube: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 1,
        comment: 'Tube number (1-12)'
    },
    tube_color: {
        type: DataTypes.ENUM(...CORE_COLORS),
        allowNull: false,
        defaultValue: 'Blue'
    },
    core_color: {
        type: DataTypes.ENUM(...CORE_COLORS),
        allowNull: false
    },
    status: {
        type: DataTypes.ENUM('Active', 'Cut', 'Alokasi', 'Idle', 'None', 'Bad'),
        allowNull: false,
        defaultValue: 'None'
    },
    description_core: {
        type: DataTypes.TEXT,
        allowNull: true
    },
    destination: {
        type: DataTypes.STRING(255),
        allowNull: true
    },
    customer: {
        type: DataTypes.STRING(255),
        allowNull: true
    },
    description: {
        type: DataTypes.TEXT,
        allowNull: true
    }
}, {
    tableName: 'odc_cores',
    timestamps: true
});

OdcCore.CORE_COLORS = CORE_COLORS;

module.exports = OdcCore;
