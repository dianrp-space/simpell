const { Op } = require('sequelize');
const { likePattern, parseDisplayDate } = require('./sheetValue');

function readList(query, columns, options = {}) {
    const keys = columns.map((column) => column.key);
    const statuses = options.statuses || [];
    const sortKey = keys.includes(query.sort) ? query.sort : (options.sort || keys[0]);
    const dir = String(query.dir || options.dir || 'asc').toLowerCase() === 'desc' ? 'DESC' : 'ASC';
    const filters = {};
    columns.forEach((column) => {
        if (column.key === 'status') return;
        filters[column.key] = String(query['f_' + column.key] || '').trim();
    });
    return {
        sortKey,
        dir,
        sorting: keys.includes(query.sort),
        search: String(query.search || '').trim(),
        status: statuses.includes(query.status) ? query.status : '',
        filters,
        statuses
    };
}

function textClause(field, value) {
    if (value === '-') {
        return { [Op.or]: [{ [field]: null }, { [field]: '' }, { [field]: '-' }] };
    }
    return { [field]: { [Op.like]: likePattern(value) } };
}

function dateClause(sequelize, field, value) {
    if (value === '-') return { [field]: null };
    const exact = parseDisplayDate(value);
    if (exact) return { [field]: exact };
    return sequelize.where(
        sequelize.fn('DATE_FORMAT', sequelize.col(field), '%d/%m/%Y'),
        { [Op.like]: likePattern(value) }
    );
}

function buildWhere(state, options = {}) {
    const and = [];
    const searchFields = options.searchFields || [];
    if (state.search && searchFields.length) {
        const pattern = likePattern(state.search);
        const or = searchFields.map((field) => ({ [field]: { [Op.like]: pattern } }));
        if (options.dateField && options.sequelize) {
            or.push(dateClause(options.sequelize, options.dateField, state.search));
        }
        and.push({ [Op.or]: or });
    }
    Object.entries(state.filters).forEach(([field, value]) => {
        if (!value) return;
        if (field === options.dateField && options.sequelize) {
            and.push(dateClause(options.sequelize, field, value));
            return;
        }
        if (options.numericFields && options.numericFields.includes(field) && options.sequelize) {
            if (value === '-') {
                and.push({ [field]: null });
                return;
            }
            and.push(options.sequelize.where(
                options.sequelize.cast(options.sequelize.col(field), 'CHAR'),
                { [Op.like]: likePattern(value) }
            ));
            return;
        }
        and.push(textClause(field, value));
    });
    if (options.withStatus !== false && state.status) and.push({ status: state.status });
    return and.length ? { [Op.and]: and } : {};
}

function listHref(base, state, overrides = {}) {
    const params = new URLSearchParams();
    const next = {
        search: state.search,
        status: state.status,
        sort: state.sorting ? state.sortKey : '',
        dir: state.sorting ? state.dir.toLowerCase() : '',
        ...Object.fromEntries(
            Object.entries(state.filters)
                .filter(([, value]) => value)
                .map(([key, value]) => ['f_' + key, value])
        ),
        ...overrides
    };
    Object.entries(next).forEach(([key, value]) => {
        if (value) params.set(key, String(value));
    });
    const query = params.toString();
    return query ? `${base}?${query}` : base;
}

function columnMeta(base, state, columns) {
    return columns.map((column) => {
        const active = state.sorting && state.sortKey === column.key;
        const nextDir = active && state.dir === 'ASC' ? 'desc' : 'asc';
        return {
            ...column,
            active,
            direction: active ? state.dir.toLowerCase() : '',
            href: listHref(base, state, { sort: column.key, dir: nextDir })
        };
    });
}

module.exports = {
    readList,
    buildWhere,
    listHref,
    columnMeta
};
