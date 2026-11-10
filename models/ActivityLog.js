const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const ActivityLog = sequelize.define('ActivityLog', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    user_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: {
            model: 'users',
            key: 'id'
        }
    },
    action: {
        type: DataTypes.STRING(100),
        allowNull: false
    },
    description: {
        type: DataTypes.TEXT,
        allowNull: true
    },
    entity_type: {
        type: DataTypes.STRING(50),
        allowNull: true
    },
    entity_id: {
        type: DataTypes.INTEGER,
        allowNull: true
    },
    ip_address: {
        type: DataTypes.STRING(50),
        allowNull: true
    },
    user_agent: {
        type: DataTypes.TEXT,
        allowNull: true
    }
}, {
    tableName: 'activity_logs',
    timestamps: true,
    underscored: true
});

module.exports = ActivityLog;
