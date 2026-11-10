require('dotenv').config();
const { sequelize } = require('../models');

async function syncDatabase() {
    try {
        console.log('Syncing database...');
        await sequelize.sync({ alter: true });
        console.log('✓ Database synchronized successfully!');
        process.exit(0);
    } catch (error) {
        console.error('✗ Error syncing database:', error.message);
        process.exit(1);
    }
}

syncDatabase();
