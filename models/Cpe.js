const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');


const Cpe = sequelize.define('Cpe', {
    id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true
    },

    pelanggan_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: {
            model: 'pelanggan',
            key: 'id'
        }
    },
    sn_perangkat: {
        type: DataTypes.STRING,
        allowNull: true
    },
    mac_address: {
        type: DataTypes.STRING,
        allowNull: true
    },
    ip_wan: {
        type: DataTypes.STRING,
        allowNull: true
    },
    keterangan: {
        type: DataTypes.TEXT,
        allowNull: true
    }
}, {
    tableName: 'cpe',
    timestamps: true
});



module.exports = Cpe;
