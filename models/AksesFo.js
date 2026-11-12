const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

// Node model - stores unique nodes
const AksesFoNode = sequelize.define('AksesFoNode', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    node: {
        type: DataTypes.STRING(50),
        allowNull: false,
        unique: true,
        comment: 'Node code (combination of numbers and capital letters)'
    },
    jenis: {
        type: DataTypes.ENUM('FO', 'FO_P2P', 'DIRECT_LAN', 'FO_XCONNECT'),
        allowNull: false,
        defaultValue: 'FO'
    }
}, {
    tableName: 'akses_fo_nodes',
    timestamps: true
});

// Port OLT model - stores ports belonging to nodes
const AksesFo = sequelize.define('AksesFo', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    node_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: 'akses_fo_nodes',
            key: 'id'
        }
    },
    port_olt: {
        type: DataTypes.STRING(100),
        allowNull: false
    },
    sn_modem: {
        type: DataTypes.STRING(100),
        allowNull: true
    },

    redaman_value: {
        type: DataTypes.DECIMAL(6, 2),
        allowNull: true,
        comment: 'Attenuation value in dB'
    },
    redaman_date: {
        type: DataTypes.DATE,
        allowNull: true,
        comment: 'Date of attenuation update'
    },
    bandwidth: {
        type: DataTypes.STRING(50),
        allowNull: true
    },
    keterangan: {
        type: DataTypes.TEXT,
        allowNull: true
    },
    pelanggan_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: {
            model: 'pelanggan',
            key: 'id'
        }
    }
}, {
    tableName: 'akses_fo',
    timestamps: true
});

// Relationships
AksesFoNode.hasMany(AksesFo, { foreignKey: 'node_id', as: 'ports' });
AksesFo.belongsTo(AksesFoNode, { foreignKey: 'node_id', as: 'nodeInfo' });

module.exports = { AksesFo, AksesFoNode };
