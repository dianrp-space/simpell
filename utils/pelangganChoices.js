const { Pelanggan } = require('../models');

function pelangganChoices() {
    return Pelanggan.findAll({
        attributes: ['id', 'no_jaringan', 'nama_pelanggan', 'service', 'bandwidth', 'akses', 'node', 'kota', 'koordinat', 'status', 'kontak', 'email', 'alamat', 'keterangan'],
        order: [['nama_pelanggan', 'ASC']],
        raw: true
    });
}

module.exports = pelangganChoices;
