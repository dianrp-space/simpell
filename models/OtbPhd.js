const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const CORE_COLORS = [
    'Blue', 'Orange', 'Green', 'Brown', 'Gray', 'White',
    'Red', 'Black', 'Yellow', 'Purple', 'Pink', 'Aqua'
];

const OtbPhd = sequelize.define('OtbPhd', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    central_id: {
        type: DataTypes.INTEGER,
        allowNull: true, // Allow null for existing data, enforce in app logic
        references: {
            model: 'otb_centrals',
            key: 'id'
        },
        onDelete: 'CASCADE'
    },
    sector: {
        type: DataTypes.STRING(50),
        allowNull: false
    },
    tube_number: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 1,
        comment: 'Tube number (1, 2, 3, ...)'
    },
    tube_color: {
        type: DataTypes.ENUM(...CORE_COLORS),
        allowNull: true,
        comment: 'Color of the tube based on tube_number (1-12 cycle)'
    },
    core_number: {
        type: DataTypes.INTEGER,
        allowNull: false,
        comment: 'Core number within the tube (1-12)'
    },
    core_color: {
        type: DataTypes.ENUM(...CORE_COLORS),
        allowNull: true
    },
    status: {
        type: DataTypes.ENUM('Active', 'Cut', 'Alokasi', 'Idle', 'None'),
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
    keterangan: {
        type: DataTypes.TEXT,
        allowNull: true
    }
}, {
    tableName: 'otb_phd',
    timestamps: true
});

OtbPhd.CORE_COLORS = CORE_COLORS;

module.exports = OtbPhd;
