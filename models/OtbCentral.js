const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const OtbCentral = sequelize.define('OtbCentral', {
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
    tableName: 'otb_centrals',
    timestamps: true
});

module.exports = OtbCentral;
