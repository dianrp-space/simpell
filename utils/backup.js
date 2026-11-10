const fs = require('fs/promises');
const path = require('path');
const os = require('os');
const { spawn } = require('child_process');
const mysql = require('mysql2/promise');

const FORMAT = 1;

function dbConfig(multipleStatements) {
    return {
        host: process.env.DB_HOST,
        port: Number(process.env.DB_PORT) || 3306,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME,
        dateStrings: true,
        charset: 'utf8mb4',
        multipleStatements: Boolean(multipleStatements)
    };
}

function quoteIdent(name) {
    return '`' + String(name).replace(/`/g, '``') + '`';
}

function sqlString(value) {
    return "'" + String(value)
        .replace(/\\/g, '\\\\')
        .replace(/\0/g, '\\0')
        .replace(/\n/g, '\\n')
        .replace(/\r/g, '\\r')
        .replace(/\u001a/g, '\\Z')
        .replace(/'/g, "\\'") + "'";
}

function sqlLiteral(value) {
    if (value === null || value === undefined) return 'NULL';
    if (Buffer.isBuffer(value)) return "X'" + value.toString('hex') + "'";
    if (typeof value === 'number') return Number.isFinite(value) ? String(value) : 'NULL';
    if (typeof value === 'bigint') return value.toString();
    if (typeof value === 'boolean') return value ? '1' : '0';
    if (value instanceof Date) {
        return sqlString(value.toISOString().slice(0, 19).replace('T', ' '));
    }
    if (typeof value === 'object') return sqlString(JSON.stringify(value));
    return sqlString(value);
}

function writeChunk(stream, chunk) {
    if (stream.write(chunk)) return Promise.resolve();
    return new Promise((resolve) => stream.once('drain', resolve));
}

function run(command, args) {
    return new Promise((resolve, reject) => {
        const child = spawn(command, args);
        let stderr = '';
        let stdout = '';
        child.stdout.on('data', (chunk) => { stdout += chunk; });
        child.stderr.on('data', (chunk) => { stderr += chunk; });
        child.on('error', (error) => {
            if (error.code === 'ENOENT') {
                reject(new Error('Perintah tar tidak ditemukan di server ini.'));
                return;
            }
            reject(error);
        });
        child.on('close', (code) => {
            if (code === 0) resolve(stdout);
            else reject(new Error(stderr.trim() || command + ' berhenti dengan kode ' + code));
        });
    });
}

async function writeDatabaseSql(filePath) {
    const connection = await mysql.createConnection(dbConfig(false));
    const stream = require('fs').createWriteStream(filePath);
    try {
        await writeChunk(stream, '-- SIMPELL BACKUP\nSET NAMES utf8mb4;\nSET FOREIGN_KEY_CHECKS=0;\n');
        const [tables] = await connection.query("SHOW FULL TABLES WHERE Table_type = 'BASE TABLE'");
        const names = tables.map((row) => Object.values(row)[0]);
        let rowCount = 0;
        for (const table of names) {
            const [created] = await connection.query('SHOW CREATE TABLE ' + quoteIdent(table));
            const createSql = created[0]['Create Table'];
            await writeChunk(stream, '\nDROP TABLE IF EXISTS ' + quoteIdent(table) + ';\n' + createSql + ';\n');
            const [counted] = await connection.query('SELECT COUNT(*) AS total FROM ' + quoteIdent(table));
            const total = Number(counted[0].total);
            const batch = 100;
            for (let offset = 0; offset < total; offset += batch) {
                const [rows] = await connection.query(
                    'SELECT * FROM ' + quoteIdent(table) + ' LIMIT ' + batch + ' OFFSET ' + offset
                );
                if (!rows.length) break;
                const columns = Object.keys(rows[0]).map(quoteIdent).join(', ');
                const values = rows.map((row) => '(' + Object.values(row).map(sqlLiteral).join(', ') + ')').join(',\n');
                await writeChunk(stream, 'INSERT INTO ' + quoteIdent(table) + ' (' + columns + ') VALUES\n' + values + ';\n');
                rowCount += rows.length;
            }
        }
        await writeChunk(stream, 'SET FOREIGN_KEY_CHECKS=1;\n');
        await new Promise((resolve, reject) => stream.end((error) => error ? reject(error) : resolve()));
        return { tables: names.length, rows: rowCount };
    } catch (error) {
        stream.destroy();
        throw error;
    } finally {
        await connection.end();
    }
}

function uploadsDir() {
    return path.join(__dirname, '..', 'public', 'uploads');
}

async function createBackupArchive(destPath) {
    const work = await fs.mkdtemp(path.join(os.tmpdir(), 'simpell-backup-'));
    try {
        const stats = await writeDatabaseSql(path.join(work, 'database.sql'));
        const source = uploadsDir();
        const target = path.join(work, 'uploads');
        try {
            await fs.cp(source, target, { recursive: true });
        } catch (error) {
            if (error.code !== 'ENOENT') throw error;
            await fs.mkdir(target, { recursive: true });
        }
        const manifest = {
            app: 'simpell',
            format: FORMAT,
            createdAt: new Date().toISOString(),
            tables: stats.tables,
            rows: stats.rows
        };
        await fs.writeFile(path.join(work, 'manifest.json'), JSON.stringify(manifest, null, 2));
        await fs.mkdir(path.dirname(destPath), { recursive: true });
        await run('tar', ['-czf', destPath, '-C', work, 'manifest.json', 'database.sql', 'uploads']);
        return manifest;
    } finally {
        await fs.rm(work, { recursive: true, force: true });
    }
}

function assertSafeEntries(entries) {
    const names = entries.map((entry) => entry.replace(/\\/g, '/').replace(/^\.\//, ''));
    for (const entry of names) {
        if (entry.startsWith('/') || entry.split('/').includes('..')) {
            throw new Error('Arsip berisi jalur yang tidak diizinkan.');
        }
    }
    if (!names.includes('manifest.json') || !names.includes('database.sql')) {
        throw new Error('File ini bukan cadangan SIMPELL.');
    }
    return names;
}

function splitSql(sql) {
    const statements = [];
    let current = '';
    let inString = false;
    let escaped = false;
    for (const ch of sql) {
        if (escaped) {
            current += ch;
            escaped = false;
            continue;
        }
        if (inString) {
            current += ch;
            if (ch === '\\') escaped = true;
            else if (ch === "'") inString = false;
            continue;
        }
        if (ch === "'") {
            inString = true;
            current += ch;
            continue;
        }
        if (ch === ';') {
            const statement = current.trim();
            if (statement) statements.push(statement);
            current = '';
            continue;
        }
        current += ch;
    }
    const tail = current.trim();
    if (tail) statements.push(tail);
    return statements;
}

async function restoreBackupArchive(archivePath) {
    const listed = (await run('tar', ['-tzf', archivePath])).split('\n').map((line) => line.trim()).filter(Boolean);
    assertSafeEntries(listed);
    const work = await fs.mkdtemp(path.join(os.tmpdir(), 'simpell-restore-'));
    const savedUploads = await fs.mkdtemp(path.join(os.tmpdir(), 'simpell-uploads-'));
    const uploads = uploadsDir();
    let replacedUploads = false;
    try {
        await run('tar', ['-xzf', archivePath, '-C', work]);
        const manifest = JSON.parse(await fs.readFile(path.join(work, 'manifest.json'), 'utf8'));
        if (manifest.app !== 'simpell' || Number(manifest.format) !== FORMAT) {
            throw new Error('Format cadangan tidak dikenali.');
        }
        const sql = await fs.readFile(path.join(work, 'database.sql'), 'utf8');
        if (!sql.startsWith('-- SIMPELL BACKUP')) {
            throw new Error('Isi database pada cadangan tidak dikenali.');
        }
        const connection = await mysql.createConnection(dbConfig(false));
        try {
            for (const statement of splitSql(sql)) {
                if (statement.startsWith('--') && !statement.includes('\n')) continue;
                await connection.query(statement);
            }
        } finally {
            await connection.end();
        }
        const saved = path.join(savedUploads, 'uploads');
        try {
            await fs.cp(uploads, saved, { recursive: true });
        } catch (error) {
            if (error.code !== 'ENOENT') throw error;
        }
        await fs.rm(uploads, { recursive: true, force: true });
        replacedUploads = true;
        const extracted = path.join(work, 'uploads');
        try {
            await fs.cp(extracted, uploads, { recursive: true });
        } catch (error) {
            if (error.code !== 'ENOENT') throw error;
            await fs.mkdir(uploads, { recursive: true });
        }
        return manifest;
    } catch (error) {
        if (replacedUploads) {
            await fs.rm(uploads, { recursive: true, force: true });
            try {
                await fs.cp(path.join(savedUploads, 'uploads'), uploads, { recursive: true });
            } catch (copyError) {
                if (copyError.code !== 'ENOENT') console.error(copyError);
            }
        }
        throw error;
    } finally {
        await fs.rm(work, { recursive: true, force: true });
        await fs.rm(savedUploads, { recursive: true, force: true });
    }
}

module.exports = {
    createBackupArchive,
    restoreBackupArchive
};
