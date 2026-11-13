const { Pelanggan } = require('../models');

function pelangganChoices() {
    return Pelanggan.findAll({
        attributes: ['id', 'no_jaringan', 'nama_pelanggan'],
        order: [['nama_pelanggan', 'ASC']],
        raw: true
    });
}

module.exports = pelangganChoices;
