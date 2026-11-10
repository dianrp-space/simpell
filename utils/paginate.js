const PAGE_SIZE = 25;

function pageState(req, limit = PAGE_SIZE) {
    const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
    return { page, limit, offset: (page - 1) * limit };
}

function pageMeta(req, total, page, limit) {
    const safeTotal = Number(total) || 0;
    const totalPages = Math.max(Math.ceil(safeTotal / limit), 1);
    const offset = (page - 1) * limit;
    const params = { ...req.query };
    delete params.page;

    const href = (target) => {
        const q = new URLSearchParams();
        Object.entries(params).forEach(([key, value]) => {
            if (value === undefined || value === null || value === '') return;
            if (Array.isArray(value)) {
                value.forEach((item) => {
                    if (item !== undefined && item !== null && String(item) !== '') q.append(key, String(item));
                });
                return;
            }
            q.set(key, String(value));
        });
        if (target > 1) q.set('page', String(target));
        const base = req.baseUrl || req.path || '/';
        const query = q.toString();
        return query ? `${base}?${query}` : base;
    };

    const windowEnd = Math.min(totalPages, Math.max(page, 1) + 2);
    const windowStart = Math.max(1, windowEnd - 4);
    const pages = [];
    for (let n = windowStart; n <= Math.min(totalPages, windowStart + 4); n++) pages.push(n);

    return {
        page,
        limit,
        total: safeTotal,
        totalPages,
        from: safeTotal === 0 || offset >= safeTotal ? 0 : offset + 1,
        to: safeTotal === 0 || offset >= safeTotal ? 0 : Math.min(page * limit, safeTotal),
        hasPrev: page > 1,
        hasNext: page < totalPages,
        pages,
        href
    };
}

async function paginate(Model, req, options = {}) {
    const { page, limit, offset } = pageState(req, options.limit);
    const query = {
        where: options.where || {},
        order: options.order,
        limit,
        offset,
        distinct: options.distinct !== false
    };
    if (options.include) query.include = options.include;
    if (options.attributes) query.attributes = options.attributes;
    if (options.group) query.group = options.group;
    if (options.subQuery !== undefined) query.subQuery = options.subQuery;

    const result = await Model.findAndCountAll(query);
    const total = Array.isArray(result.count) ? result.count.length : result.count;
    return { rows: result.rows, pagination: pageMeta(req, total, page, limit) };
}

module.exports = { PAGE_SIZE, pageState, pageMeta, paginate };
