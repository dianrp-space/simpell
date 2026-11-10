const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');


const RadioLinkClient = sequelize.define('RadioLinkClient', {
    id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true
    },
    radio_link_ap_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: 'radio_link_ap',
            key: 'id'
        },
        onDelete: 'CASCADE'
    },
    pelanggan_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: {
            model: 'pelanggan',
            key: 'id'
        }
    },

    mac_address: {
        type: DataTypes.STRING,
        allowNull: true
    },
    ip_nms: {
        type: DataTypes.STRING,
        allowNull: true
    },
    ssid: {
        type: DataTypes.STRING,
        allowNull: true
    },
    channel_bandwidth: {
        type: DataTypes.STRING,
        allowNull: true
    },
    power: {
        type: DataTypes.STRING,
        allowNull: true
    },
    antenna_gain: {
        type: DataTypes.STRING,
        allowNull: true
    },
    network_mode: {
        type: DataTypes.STRING,
        allowNull: true
    },
    module_mode: {
        type: DataTypes.STRING,
        allowNull: true
    },
    country: {
        type: DataTypes.STRING,
        allowNull: true
    },
    frequency: {
        type: DataTypes.STRING,
        allowNull: true
    },
    username: {
        type: DataTypes.STRING,
        allowNull: true
    },
    password: {
        type: DataTypes.STRING,
        allowNull: true
    },
    latitude: {
        type: DataTypes.STRING,
        allowNull: true
    },
    longitude: {
        type: DataTypes.STRING,
        allowNull: true
    }
}, {
    tableName: 'radio_link_client',
    timestamps: true
});



module.exports = RadioLinkClient;
