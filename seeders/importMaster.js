/**
 * SIMPELL - Complete CSV Data Seeder
 * Imports ALL data from ALL 10 CSV files
 */
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const readline = require('readline');
const { sequelize, Customer, Ticket, Asset, Node, Qc } = require('../models');

// Helper: Parse CSV with custom header row using readline (async)
const parseCSV = (filePath, headerRowIndex = 0) => {
    return new Promise((resolve, reject) => {
        const lines = [];
        const rl = readline.createInterface({
            input: fs.createReadStream(filePath, 'utf-8'),
            crlfDelay: Infinity
        });

        rl.on('line', (line) => {
            lines.push(line);
        });

        rl.on('close', () => {
            if (lines.length <= headerRowIndex) {
                resolve([]);
                return;
            }

            const headers = lines[headerRowIndex].split(';').map(h => h.trim().replace(/^\uFEFF/, ''));

            const results = [];
            for (let i = headerRowIndex + 1; i < lines.length; i++) {
                const values = lines[i].split(';');
                const row = {};
                headers.forEach((header, idx) => {
                    row[header] = values[idx] ? values[idx].trim() : null;
                });
                results.push(row);
            }

            resolve(results);
        });

        rl.on('error', reject);
    });
};

// Parse date DD/MM/YYYY to YYYY-MM-DD
const parseDate = (dateStr) => {
    if (!dateStr) return null;
    const parts = dateStr.split('/');
    if (parts.length === 3) {
        return `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
    }
    return null;
};

// Cache of valid customer NO_JARs for foreign key validation
let validCustomerNoJars = new Set();

// Load all valid customer NO_JARs into cache
async function loadValidCustomerNoJars() {
    const customers = await Customer.findAll({ attributes: ['no_jar'] });
    validCustomerNoJars = new Set(customers.map(c => c.no_jar));
    console.log(`  📋 Loaded ${validCustomerNoJars.size} valid customer NO_JARs`);
}

// Check if NO_JAR exists in customers table (returns NO_JAR or NULL)
function getValidNoJar(noJar) {
    if (!noJar) return null;
    return validCustomerNoJars.has(noJar) ? noJar : null;
}

// 1. Import Customers from DATA WEB5.csv
async function importCustomers() {
    const filePath = path.join(__dirname, '..', 'DATA WEB5.csv');
    if (!fs.existsSync(filePath)) {
        console.log('⚠ DATA WEB5.csv not found');
        return 0;
    }

    console.log('📥 Importing customers from DATA WEB5.csv...');
    const data = await parseCSV(filePath, 1);

    let count = 0;
    for (const row of data) {
        if (!row['NO_JAR'] || row['NO_JAR'] === '') continue;

        try {
            await Customer.upsert({
                no_jar: row['NO_JAR'],
                nama_pelanggan: row['NAMA PELANGGAN'] || '',
                jenis_akses: row['AKSES'] || null,
                media_akses: row['MEDIA AKSES'] || null,
                bandwidth: row['BW'] || null,
                kota: row['KOTA'] || null,
                koordinat: row['LAT LONG'] || null,
                node_akses: row['NODE AKSES'] || null,
                node_service: row['NODE SERVICE'] || null,
                status: 'Active'
            });
            count++;
        } catch (err) {
            console.log(`  ❌ Error: ${err.message}`);
        }
    }
    console.log(`  ✓ ${count} customers imported`);
    return count;
}

// 2. Import SOLTEM Assets from DATA WEB.csv
async function importSoltemAssets() {
    const filePath = path.join(__dirname, '..', 'DATA WEB.csv');
    if (!fs.existsSync(filePath)) {
        console.log('⚠ DATA WEB.csv not found');
        return 0;
    }

    console.log('📥 Importing SOLTEM assets from DATA WEB.csv...');
    const data = await parseCSV(filePath, 2); // Header at row 3 (index 2)

    let count = 0;
    for (const row of data) {
        const deviceName = row['NOJAR']; // This is device name like "SOLTEM 12 - BATAM"
        const pelanggan = row['PELANGGAN'] || '';

        // Skip empty rows
        if (!deviceName && !pelanggan) continue;

        // Extract NO_JAR from PELANGGAN (e.g., "2024413113-M2M AIRNAV BATAM" -> "2024413113")
        const noJarMatch = pelanggan.match(/^(\d+)/);
        const noJar = noJarMatch ? noJarMatch[1] : null;

        try {
            await Asset.create({
                category: 'SOLTEM',
                no_jar: getValidNoJar(noJar), // Validate FK
                nama_pelanggan: pelanggan,
                lokasi: deviceName, // Store descriptive name as location
                vlan_mk: row['VLAN MK'] || null,
                ip_secondary: row['IP (KHUSUS OPEN VPN) SECONDARY (AMBIL DARI IPAM)'] || null,
                no_telkomsel: row['NO TELKOMSEL'] || null,
                keterangan: row['KETERANGAN'] || null,
                harga_kuota: row['harga dasar kuota'] || null,
                user_pass_bivo: row['USER/PASS    BIVO'] || null,
                user_pass_mk: row['USER /PASS MK'] || null,
                sn_firmware: row['SN FIRMWARE'] || null,
                sn_hardware: row['SN HARDWARE'] || null,
                noreg_modem: row['NOREG MODEM'] || null,
                noreg_psu: row['NOREG PSU'] || null,
                status: 'Active'
            });
            count++;
        } catch (err) {
            console.log(`  ⚠ SOLTEM error: ${err.message}`);
        }
    }
    console.log(`  ✓ ${count} SOLTEM assets imported`);
    return count;
}

// 3. Import Starlink Assets from DATA WEB1.csv
async function importStarlinkAssets() {
    const filePath = path.join(__dirname, '..', 'DATA WEB1.csv');
    if (!fs.existsSync(filePath)) {
        console.log('⚠ DATA WEB1.csv not found');
        return 0;
    }

    console.log('📥 Importing Starlink assets from DATA WEB1.csv...');
    const data = await parseCSV(filePath, 0);

    let count = 0;
    for (const row of data) {
        const nojar = row['No_jar'];
        if (!nojar || nojar === '') continue;

        try {
            await Asset.create({
                category: 'STARLINK',
                no_jar: getValidNoJar(nojar), // Validate FK
                nama_pelanggan: row['Nama_Pelanggan'] || null,
                sn_kit: row['SN_KIT'] || null,
                sn_mikrotik: row['SN_MIKROTIK'] || null,
                noreg_psu: row['NOREG_PSU'] || null,
                noreg_kit: row['NOREG_KIT'] || null,
                starlink_type: row['STARLINK'] || null,
                web_prtg: row['Web_PRTG'] || null,
                user_pass: row['USER_PASS'] || null,
                keterangan: row['KET.'] || null,
                status: 'Active'
            });
            count++;
        } catch (err) {
            console.log(`  ⚠ Starlink error: ${err.message}`);
        }
    }
    console.log(`  ✓ ${count} Starlink assets imported`);
    return count;
}

// 4. Import M2M Assets from DATA WEB2.csv
async function importM2MAssets() {
    const filePath = path.join(__dirname, '..', 'DATA WEB2.csv');
    if (!fs.existsSync(filePath)) {
        console.log('⚠ DATA WEB2.csv not found');
        return 0;
    }

    console.log('📥 Importing M2M assets from DATA WEB2.csv...');
    const data = await parseCSV(filePath, 0);

    let count = 0;
    for (const row of data) {
        const nojar = row['No_jar'];
        if (!nojar || nojar === '') continue;

        try {
            await Asset.create({
                category: 'M2M',
                no_jar: getValidNoJar(nojar), // Validate FK
                nama_pelanggan: row['Site Name'] || null,
                lokasi: row['Lokasi'] || null,
                sn_firmware: row['SN FIRMWARE'] || null,
                sn_hardware: row['SN HARDWARE'] || null,
                noreg_psu: row['NOREG_PSU'] || null,
                noreg_modem: row['NOREG_MODEM'] || null,
                no_telkomsel: row['NO GSM'] || null,
                kuota: row['KUOTA'] || null,
                slot_sim: row['SLOT SIM'] || null,
                keterangan: row['KET.'] || null,
                status: 'Active'
            });
            count++;
        } catch (err) {
            console.log(`  ⚠ M2M error: ${err.message}`);
        }
    }
    console.log(`  ✓ ${count} M2M assets imported`);
    return count;
}

// 5. Import VSAT Assets from DATA WEB3.csv
async function importVSATAssets() {
    const filePath = path.join(__dirname, '..', 'DATA WEB3.csv');
    if (!fs.existsSync(filePath)) {
        console.log('⚠ DATA WEB3.csv not found');
        return 0;
    }

    console.log('📥 Importing VSAT assets from DATA WEB3.csv...');
    const data = await parseCSV(filePath, 1);

    let count = 0;
    for (const row of data) {
        const nojar = row['NO_JAR'];
        if (!nojar || nojar === '') continue;

        try {
            await Asset.create({
                category: 'VSAT',
                no_jar: getValidNoJar(nojar), // Validate FK
                nama_pelanggan: row['NAMA PELANGGAN'] || null,
                sn_modem: row['MODEM'] || null,
                satelit: row['SATELITE'] || null,
                keterangan: row['KET'] || null,
                status: 'Active'
            });
            count++;
        } catch (err) {
            console.log(`  ⚠ VSAT error: ${err.message}`);
        }
    }
    console.log(`  ✓ ${count} VSAT assets imported`);
    return count;
}

// 6. Import FO Assets from DATA WEB4.csv
async function importFOAssets() {
    const filePath = path.join(__dirname, '..', 'DATA WEB4.csv');
    if (!fs.existsSync(filePath)) {
        console.log('⚠ DATA WEB4.csv not found');
        return 0;
    }

    console.log('📥 Importing FO assets from DATA WEB4.csv...');
    const data = await parseCSV(filePath, 1);

    let count = 0;
    for (const row of data) {
        // FO may not have NO_JAR, use SN_MODEM ONT instead
        const snModem = row['SN_MODEM ONT'];
        if (!snModem || snModem === '') continue;

        try {
            await Asset.create({
                category: 'FO',
                no_jar: getValidNoJar(row['NO_JAR']), // Validate FK
                nama_pelanggan: row['NAMA_PELANGGAN'] || null,
                olt: row['OLT'] || null,
                sn_modem: snModem,
                redaman: row['REDAMAN'] || null,
                keterangan: row['KET.'] || null,
                node_akses_fo: row['NODE AKSES FO'] || null,
                status: 'Active'
            });
            count++;
        } catch (err) {
            // Skip errors
        }
    }
    console.log(`  ✓ ${count} FO assets imported`);
    return count;
}

// 7. Import Nodes from DATA WEB6.csv
async function importNodes() {
    const filePath = path.join(__dirname, '..', 'DATA WEB6.csv');
    if (!fs.existsSync(filePath)) {
        console.log('⚠ DATA WEB6.csv not found');
        return 0;
    }

    console.log('📥 Importing nodes from DATA WEB6.csv...');
    const content = fs.readFileSync(filePath, 'utf-8');
    const lines = content.split(/\r?\n/).filter(line => line.trim());

    let count = 0;
    for (let i = 2; i < lines.length; i++) {
        const values = lines[i].split(';').map(v => v.trim());
        if (!values[1] || values[1] === 'TOTAL') continue;

        try {
            await Node.upsert({
                nama_node: values[1],
                kota: values[2] || null,
                jumlah_node: parseInt(values[3]) || 0,
                jumlah_splitter: parseInt(values[4]) || 0,
                jumlah_si_ont: parseInt(values[5]) || 0,
                jumlah_si_p2p: parseInt(values[6]) || 0,
                jumlah_hh: parseInt(values[7]) || 0,
                panjang_backbone: parseFloat(values[8]) || 0,
                panjang_lastmile: parseFloat(values[9]) || 0,
                jumlah_tiang: parseInt(values[10]) || 0
            });
            count++;
        } catch (err) {
            console.log(`  ❌ Error: ${err.message}`);
        }
    }
    console.log(`  ✓ ${count} nodes imported`);
    return count;
}

// 8. Import QC PSB from DATA WEB7.csv
async function importQc() {
    const filePath = path.join(__dirname, '..', 'DATA WEB7.csv');
    if (!fs.existsSync(filePath)) {
        console.log('⚠ DATA WEB7.csv not found');
        return 0;
    }

    console.log('📥 Importing QC PSB from DATA WEB7.csv...');
    const data = await parseCSV(filePath, 1);

    let count = 0;
    for (const row of data) {
        const sia = row['SIA'];
        if (!sia || sia === '') continue;

        try {
            await Qc.create({
                sia: sia,
                nama_pelanggan: row['PELANGGAN'] || null,
                akses: row['AKSES'] || null,
                tanggal_aktivasi: parseDate(row['AKTIVASI']),
                status_qc: row['QC'] === 'DONE' ? 'DONE' : 'PENDING',
                keterangan: row['KET'] || null,
                periode: 'Desember 2025'
            });
            count++;
        } catch (err) {
            // Skip errors
        }
    }
    console.log(`  ✓ ${count} QC records imported`);
    return count;
}

// 9. Import PM Log from DATA WEB8.csv
async function importPmLog() {
    const filePath = path.join(__dirname, '..', 'DATA WEB8.csv');
    if (!fs.existsSync(filePath)) {
        console.log('⚠ DATA WEB8.csv not found');
        return 0;
    }

    console.log('📥 Importing PM Log from DATA WEB8.csv...');
    const data = await parseCSV(filePath, 0);

    let count = 0;
    let currentTicket = null;

    for (const row of data) {
        const tanggal = row['TANGGAL'];
        const caseType = row['CASE'];
        const noTicket = row['NO_TICKET'];

        // Skip continuation lines (multi-line entries)
        if (!tanggal && !noTicket) continue;

        try {
            await Ticket.create({
                tanggal: parseDate(tanggal),
                case_type: caseType || null,
                no_ticket: noTicket || null,
                no_jar: row['NO_JAR'] || null,
                nama_pelanggan: row['NAMA PELANGGAN'] || null,
                keluhan: row['RINCIAN'] || null,
                akses: row['AKSES'] || null,
                teknisi: row['P.J'] || null,
                status: row['STATUS'] === 'DONE' ? 'Done' : 'Open',
                keterangan: row['KETERANGAN'] || null
            });
            count++;
        } catch (err) {
            // Skip errors
        }
    }
    console.log(`  ✓ ${count} PM tickets imported`);
    return count;
}

// 10. Import GGN Harian from DATA WEB9.csv
async function importGgnHarian() {
    const filePath = path.join(__dirname, '..', 'DATA WEB9.csv');
    if (!fs.existsSync(filePath)) {
        console.log('⚠ DATA WEB9.csv not found');
        return 0;
    }

    console.log('📥 Importing GGN Harian from DATA WEB9.csv...');
    const data = await parseCSV(filePath, 1);

    let count = 0;
    for (const row of data) {
        const noTicket = row['NO_TICKET'];
        if (!noTicket || noTicket === '') continue;

        try {
            await Ticket.create({
                tanggal: parseDate(row['TANGGAL']),
                case_type: row['CASE'] || 'GGN',
                no_ticket: noTicket,
                no_jar: row['NO_JAR'] || null,
                nama_pelanggan: row['NAMA PELANGGAN'] || null,
                keluhan: row['DETAIL RINCIAN'] || null,
                rfo: row['RFO'] || null,
                akses: row['AKSES'] || null,
                teknisi: row['P.J'] || null,
                durasi_progress: row['DURASI PROGRESS'] || null,
                status: row['DURASI PROGRESS'] ? 'Done' : 'Open'
            });
            count++;
        } catch (err) {
            // Skip errors
        }
    }
    console.log(`  ✓ ${count} GGN tickets imported`);
    return count;
}

// Main function
async function main() {
    try {
        console.log('═'.repeat(60));
        console.log('  SIMPELL - Complete Data Seeder');
        console.log('═'.repeat(60));

        await sequelize.authenticate();
        console.log('✓ Database connected\n');

        // Note: Not clearing data - run DROP TABLES manually if needed
        // console.log('🗑️  Clearing existing data...');
        // await Qc.destroy({ where: {} });
        // await Ticket.destroy({ where: {} });
        // await Asset.destroy({ where: {} });
        // await Node.destroy({ where: {} });
        // await Customer.destroy({ where: {} });
        console.log('  ⚪ Skipping data clear (use force sync if needed)\n');

        // Sync tables
        await sequelize.sync({ alter: true });
        console.log('✓ Tables synchronized\n');

        // Import all data
        console.log('─'.repeat(60));
        const customerCount = await importCustomers();

        // Load valid customer NO_JARs for FK validation
        await loadValidCustomerNoJars();

        console.log('─'.repeat(60));
        const soltemCount = await importSoltemAssets();
        const starlinkCount = await importStarlinkAssets();
        const m2mCount = await importM2MAssets();
        const vsatCount = await importVSATAssets();
        const foCount = await importFOAssets();
        console.log('─'.repeat(60));
        const nodeCount = await importNodes();
        console.log('─'.repeat(60));
        const qcCount = await importQc();
        console.log('─'.repeat(60));
        const pmCount = await importPmLog();
        const ggnCount = await importGgnHarian();

        // Summary
        console.log('\n' + '═'.repeat(60));
        console.log('  IMPORT SUMMARY');
        console.log('═'.repeat(60));
        console.log(`  📊 Customers:    ${customerCount}`);
        console.log(`  📊 Assets:       ${soltemCount + starlinkCount + m2mCount + vsatCount + foCount}`);
        console.log(`     - SOLTEM:     ${soltemCount}`);
        console.log(`     - Starlink:   ${starlinkCount}`);
        console.log(`     - M2M:        ${m2mCount}`);
        console.log(`     - VSAT:       ${vsatCount}`);
        console.log(`     - FO:         ${foCount}`);
        console.log(`  📊 Nodes:        ${nodeCount}`);
        console.log(`  📊 QC PSB:       ${qcCount}`);
        console.log(`  📊 Tickets:      ${pmCount + ggnCount}`);
        console.log(`     - PM Log:     ${pmCount}`);
        console.log(`     - GGN Harian: ${ggnCount}`);
        console.log('═'.repeat(60));
        console.log('  ✓ Seeding completed successfully!');
        console.log('═'.repeat(60));

        process.exit(0);
    } catch (error) {
        console.error('✗ Seeding failed:', error.message);
        console.error(error.stack);
        process.exit(1);
    }
}

main();
