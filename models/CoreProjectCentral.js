const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const CoreProjectCentral = sequelize.define('CoreProjectCentral', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    name: {
        type: DataTypes.STRING(100),
        allowNull: false,
        unique: true
    },
    description: {
        type: DataTypes.TEXT,
        allowNull: true
    }
}, {
    tableName: 'core_project_centrals',
    timestamps: true
});

module.exports = CoreProjectCentral;
