const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const PasswordResetRequest = sequelize.define('PasswordResetRequest', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    user_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: 'users',
            key: 'id'
        }
    },
    status: {
        type: DataTypes.ENUM('pending', 'completed'),
        defaultValue: 'pending'
    }
}, {
    tableName: 'password_reset_requests',
    timestamps: true,
    underscored: true
});

module.exports = PasswordResetRequest;
