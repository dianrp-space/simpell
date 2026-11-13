const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const CORE_COLORS = [
    'Blue', 'Orange', 'Green', 'Brown', 'Gray', 'White',
    'Red', 'Black', 'Yellow', 'Purple', 'Pink', 'Aqua'
];

const CoreProjectCore = sequelize.define('CoreProjectCore', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    central_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: {
            model: 'core_project_centrals',
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
        defaultValue: 1
    },
    tube_color: {
        type: DataTypes.ENUM(...CORE_COLORS),
        allowNull: true
    },
    core_number: {
        type: DataTypes.INTEGER,
        allowNull: false
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
    tableName: 'core_project_cores',
    timestamps: true
});

CoreProjectCore.CORE_COLORS = CORE_COLORS;

module.exports = CoreProjectCore;
