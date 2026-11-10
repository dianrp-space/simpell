const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const CoreLamdaSegmentName = sequelize.define('CoreLamdaSegmentName', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    core_lamda_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: 'core_lamda',
            key: 'id'
        }
    },
    segment_order: {
        type: DataTypes.INTEGER,
        allowNull: false,
        comment: 'Order of segment (1, 2, 3, ...)'
    },
    name: {
        type: DataTypes.STRING(255),
        allowNull: false,
        comment: 'Segment name (e.g., ODC Bandara - ODC BT Besar)'
    }
}, {
    tableName: 'core_lamda_segment_names',
    timestamps: true
});

module.exports = CoreLamdaSegmentName;
