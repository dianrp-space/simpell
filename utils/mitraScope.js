const { Op } = require('sequelize');
const sequelize = require('../config/database');

function partnerName(req) {
    const user = req.session && req.session.user;
    if (!user || user.role !== 'mitra') return null;
    return String(user.nama_mitra || '').trim();
}

function scopePartner(where, req, table) {
    const name = partnerName(req);
    if (name === null) return where || {};
    const clause = name
        ? sequelize.where(sequelize.fn('LOWER', sequelize.col(`${table}.pj`)), name.toLowerCase())
        : { id: -1 };
    if (!where || !Object.keys(where).length) return clause;
    return { [Op.and]: [where, clause] };
}

function findForPartner(Model, id, req, options = {}) {
    return Model.findOne({
        ...options,
        where: scopePartner({ id }, req, Model.tableName)
    });
}

module.exports = {
    partnerName,
    scopePartner,
    findForPartner
};
