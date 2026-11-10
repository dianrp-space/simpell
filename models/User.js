const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');
const bcrypt = require('bcryptjs');

const User = sequelize.define('User', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    nama: { // Renamed from username
        type: DataTypes.STRING(100),
        allowNull: false
    },
    email: {
        type: DataTypes.STRING(100), // Changed length to 100
        allowNull: false,
        unique: true,
        validate: {
            isEmail: true
        }
    },
    password: {
        type: DataTypes.STRING(255),
        allowNull: false
    },
    no_hp: {
        type: DataTypes.STRING(20),
        allowNull: true
    },
    role: {
        type: DataTypes.ENUM('admin', 'mitra', 'karyawan', 'manager'),
        allowNull: false,
        defaultValue: 'karyawan'
    },
    sub_user: {
        type: DataTypes.ENUM('editor', 'viewer'),
        defaultValue: 'viewer'
    },
    is_verified: {
        type: DataTypes.BOOLEAN,
        defaultValue: false
    },
    is_active: {
        type: DataTypes.BOOLEAN,
        defaultValue: false
    },
    foto: {
        type: DataTypes.STRING(255),
        allowNull: true
    },
    dashboard_preferences: {
        type: DataTypes.JSON,
        allowNull: true,
        defaultValue: {
            stats: ['core_lamda', 'odc', 'pending_ggn', 'akses_fo'],
            quick_links: ['core_lamda', 'odc', 'akses_fo', 'pending_ggn']
        }
    },
    theme: {
        type: DataTypes.ENUM('light', 'dark', 'system'),
        allowNull: false,
        defaultValue: 'system'
    },
    allowed_menus: {
        type: DataTypes.JSON,
        allowNull: true,
        defaultValue: null
    }
}, {
    tableName: 'users',
    timestamps: true,
    hooks: {
        beforeCreate: async (user) => {
            if (user.password) {
                const salt = await bcrypt.genSalt(10);
                user.password = await bcrypt.hash(user.password, salt);
            }
        },
        beforeUpdate: async (user) => {
            if (user.changed('password')) {
                const salt = await bcrypt.genSalt(10);
                user.password = await bcrypt.hash(user.password, salt);
            }
        }
    }
});

// Instance method to verify password
User.prototype.verifyPassword = async function (password) {
    return await bcrypt.compare(password, this.password);
};

module.exports = User;
