const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const AdminNotification = sequelize.define('AdminNotification', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    event: {
        type: DataTypes.STRING(64),
        allowNull: false
    },
    title: {
        type: DataTypes.STRING(160),
        allowNull: false
    },
    message: {
        type: DataTypes.STRING(500),
        allowNull: false
    },
    link: {
        type: DataTypes.STRING(255),
        allowNull: true
    },
    source_key: {
        type: DataTypes.STRING(80),
        allowNull: true,
        unique: true
    },
    read_at: {
        type: DataTypes.DATE,
        allowNull: true
    }
}, {
    tableName: 'admin_notifications',
    timestamps: true,
    underscored: true
});

module.exports = AdminNotification;
