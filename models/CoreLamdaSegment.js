const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

// FO Core colors in order (1-12)
const CORE_COLORS = [
    'Blue', 'Orange', 'Green', 'Brown', 'Gray', 'White',
    'Red', 'Black', 'Yellow', 'Purple', 'Pink', 'Aqua'
];

const CoreLamdaSegment = sequelize.define('CoreLamdaSegment', {
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
    tube_number: {
        type: DataTypes.INTEGER,
        allowNull: false,
        comment: 'Tube number (1, 2, 3, ...)'
    },
    tube_color: {
        type: DataTypes.ENUM(...CORE_COLORS),
        allowNull: false,
        comment: 'Color of the tube based on tube_number (1-12 cycle)'
    },
    core_number: {
        type: DataTypes.INTEGER,
        allowNull: false,
        comment: 'Core number within the tube (1-12)'
    },
    core_color: {
        type: DataTypes.ENUM(...CORE_COLORS),
        allowNull: false,
        comment: 'Color of the core based on core_number'
    },
    segment_name_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: {
            model: 'core_lamda_segment_names',
            key: 'id'
        },
        comment: 'Reference to the segment name'
    },
    segmen_length: {
        type: DataTypes.STRING,
        allowNull: true,
        comment: 'Segment length/info for this core'
    },
    description: {
        type: DataTypes.TEXT,
        allowNull: true
    }
}, {
    tableName: 'core_lamda_segments',
    timestamps: true
});

// Helper function to get color by number (1-12)
CoreLamdaSegment.getColorByNumber = function (number) {
    const index = ((number - 1) % 12);
    return CORE_COLORS[index];
};

// Export colors for external use
CoreLamdaSegment.CORE_COLORS = CORE_COLORS;

module.exports = CoreLamdaSegment;
