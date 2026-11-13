async function columnExists(sequelize, table, column) {
    const [rows] = await sequelize.query(
        `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
         WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ?`,
        { replacements: [table, column] }
    );
    return rows.length > 0;
}

async function dropNetworkNumberUnique(sequelize) {
    const [indexes] = await sequelize.query(
        `SELECT INDEX_NAME AS name, NON_UNIQUE AS nonUnique, COLUMN_NAME AS columnName
         FROM INFORMATION_SCHEMA.STATISTICS
         WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'pelanggan' AND INDEX_NAME <> 'PRIMARY'`
    );
    const grouped = new Map();
    indexes.forEach((row) => {
        if (!grouped.has(row.name)) grouped.set(row.name, []);
        grouped.get(row.name).push(row);
    });
    for (const [name, columns] of grouped) {
        const onlyNetwork = columns.length === 1 && columns[0].columnName === 'no_jaringan';
        const unique = columns.every((column) => Number(column.nonUnique) === 0);
        if (onlyNetwork && unique) {
            await sequelize.query(`ALTER TABLE pelanggan DROP INDEX \`${name}\``);
        }
    }
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
        await dropNetworkNumberUnique(sequelize);
    }

    const [userTables] = await sequelize.query(
        `SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES
         WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users'`
    );
    if (userTables.length && !(await columnExists(sequelize, 'users', 'allowed_menus'))) {
        await sequelize.query('ALTER TABLE users ADD COLUMN allowed_menus JSON NULL');
    }

    const [pmTables] = await sequelize.query(
        `SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES
         WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'pm_ms_fo'`
    );
    if (pmTables.length && !(await columnExists(sequelize, 'pm_ms_fo', 'pj'))) {
        await sequelize.query('ALTER TABLE pm_ms_fo ADD COLUMN pj VARCHAR(100) NULL');
    }

    const [odcCoreTables] = await sequelize.query(
        `SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES
         WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'odc_cores'`
    );
    if (odcCoreTables.length) {
        await sequelize.query(
            "ALTER TABLE odc_cores MODIFY COLUMN status ENUM('Active','Cut','Alokasi','Idle','None','Bad') NOT NULL DEFAULT 'None'"
        );
    }

    const [thirdPartyTables] = await sequelize.query(
        `SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES
         WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'akses_third_party'`
    );
    if (thirdPartyTables.length && !(await columnExists(sequelize, 'akses_third_party', 'keterangan'))) {
        await sequelize.query('ALTER TABLE akses_third_party ADD COLUMN keterangan TEXT NULL');
    }

    const [msFoTables] = await sequelize.query(
        `SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES
         WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'ms_fo'`
    );
    if (msFoTables.length) {
        if (!(await columnExists(sequelize, 'ms_fo', 'kontak'))) {
            await sequelize.query('ALTER TABLE ms_fo ADD COLUMN kontak VARCHAR(50) NULL');
        }
        if (!(await columnExists(sequelize, 'ms_fo', 'email'))) {
            await sequelize.query('ALTER TABLE ms_fo ADD COLUMN email VARCHAR(255) NULL');
        }
        if (!(await columnExists(sequelize, 'ms_fo', 'alamat'))) {
            await sequelize.query('ALTER TABLE ms_fo ADD COLUMN alamat TEXT NULL');
        }
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
module.exports.dropNetworkNumberUnique = dropNetworkNumberUnique;
