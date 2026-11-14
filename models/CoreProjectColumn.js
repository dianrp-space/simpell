const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const CoreProjectColumn = sequelize.define('CoreProjectColumn', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    central_id: {
        type: DataTypes.INTEGER,
        allowNull: true
    },
    sector: {
        type: DataTypes.TEXT,
        allowNull: false
    },
    name: {
        type: DataTypes.STRING(40),
        allowNull: false
    },
    sort_order: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0
    }
}, {
    tableName: 'core_project_columns',
    timestamps: true
});

module.exports = CoreProjectColumn;
