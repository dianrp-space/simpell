const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const CoreLamda = sequelize.define('CoreLamda', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    lokasi: {
        type: DataTypes.STRING(255),
        allowNull: false
    },
    cable_capacity: {
        type: DataTypes.INTEGER,
        allowNull: false,
        comment: 'Total core capacity (e.g., 12, 24, 48, 96)'
    },
    tube_count: {
        type: DataTypes.INTEGER,
        allowNull: false,
        comment: 'Number of tubes = cable_capacity / 12'
    },
    description: {
        type: DataTypes.TEXT,
        allowNull: true
    }
}, {
    tableName: 'core_lamda',
    timestamps: true,
    hooks: {
        beforeValidate: (instance) => {
            // Auto-calculate tube count from cable capacity
            if (instance.cable_capacity) {
                instance.tube_count = Math.ceil(instance.cable_capacity / 12);
            }
        }
    }
});

module.exports = CoreLamda;
