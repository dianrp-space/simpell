async function columnExists(sequelize, table, column) {
    const [rows] = await sequelize.query(
        `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
         WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ?`,
        { replacements: [table, column] }
    );
    return rows.length > 0;
}

async function ensureSchema(sequelize) {
    const [tables] = await sequelize.query(
        `SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES
         WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'akses_fo_nodes'`
    );
    if (tables.length && !(await columnExists(sequelize, 'akses_fo_nodes', 'jenis'))) {
        await sequelize.query(
            "ALTER TABLE akses_fo_nodes ADD COLUMN jenis ENUM('FO','FO_P2P','DIRECT_LAN','FO_XCONNECT') NOT NULL DEFAULT 'FO'"
        );
    }
    if (tables.length) {
        await sequelize.query(
            "ALTER TABLE akses_fo_nodes MODIFY COLUMN jenis ENUM('FO','FO_P2P','DIRECT_LAN','FO_XCONNECT') NOT NULL DEFAULT 'FO'"
        );
    }

    const pelangganColumns = {
        service: 'VARCHAR(100) NULL',
        bandwidth: 'VARCHAR(50) NULL',
        akses: 'VARCHAR(100) NULL',
        node: 'VARCHAR(100) NULL',
        kota: 'VARCHAR(100) NULL',
        koordinat: 'VARCHAR(255) NULL'
    };
    const [pelangganTables] = await sequelize.query(
        `SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES
         WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'pelanggan'`
    );
    if (pelangganTables.length) {
        for (const [column, definition] of Object.entries(pelangganColumns)) {
            if (!(await columnExists(sequelize, 'pelanggan', column))) {
                await sequelize.query(`ALTER TABLE pelanggan ADD COLUMN ${column} ${definition}`);
            }
        }
    }

    const [userTables] = await sequelize.query(
        `SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES
         WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users'`
    );
    if (userTables.length && !(await columnExists(sequelize, 'users', 'allowed_menus'))) {
        await sequelize.query('ALTER TABLE users ADD COLUMN allowed_menus JSON NULL');
    }

    await sequelize.query(
        `CREATE TABLE IF NOT EXISTS sessions (
            sid VARCHAR(255) NOT NULL PRIMARY KEY,
            data TEXT NOT NULL,
            expires DATETIME NOT NULL,
            KEY sessions_expires (expires)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`
    );
    await sequelize.query('DELETE FROM sessions WHERE expires < NOW()');
}

module.exports = ensureSchema;
