const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const RadioLinkAp = sequelize.define('RadioLinkAp', {
    id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true
    },
    nama_ap: {
        type: DataTypes.STRING,
        allowNull: false
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
        type: DataTypes.STRING, /* e.g. Bridge, Router */
        allowNull: true
    },
    module_mode: {
        type: DataTypes.STRING, /* e.g. AP, Station */
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
    tableName: 'radio_link_ap',
    timestamps: true
});

module.exports = RadioLinkAp;
