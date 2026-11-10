const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const { createBackupArchive } = require('../utils/backup');

const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
const dest = path.join(__dirname, '..', 'backups', 'simpell-backup-' + stamp + '.tar.gz');

createBackupArchive(dest)
    .then((manifest) => {
        console.log('Cadangan tersimpan: ' + dest);
        console.log(manifest.tables + ' tabel, ' + manifest.rows + ' baris');
    })
    .catch((error) => {
        console.error(error.message);
        process.exit(1);
    });
