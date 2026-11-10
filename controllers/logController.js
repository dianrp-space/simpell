const { ActivityLog, User } = require('../models');
const { Op } = require('sequelize');
const { paginate } = require('../utils/paginate');

exports.index = async (req, res) => {
    try {
        const { search, action, start_date, end_date } = req.query;

        let where = {};

        // Date Filter
        if (start_date || end_date) {
            const start = start_date ? new Date(start_date) : new Date(0);
            const end = end_date ? new Date(end_date) : new Date();
            end.setHours(23, 59, 59, 999);
            where.createdAt = { [Op.between]: [start, end] };
        }

        // Action Filter
        if (action) {
            where.action = action;
        }

        // Search Filter
        if (search) {
            const matchingUsers = await User.findAll({
                where: { nama: { [Op.like]: `%${search}%` } },
                attributes: ['id']
            });
            const userIds = matchingUsers.map(u => u.id);

            where[Op.or] = [
                { description: { [Op.like]: `%${search}%` } },
                { user_id: { [Op.in]: userIds } }
            ];
        }

        const { rows, pagination } = await paginate(ActivityLog, req, {
            where,
            include: [{ model: User, as: 'user', attributes: ['nama'] }],
            order: [['createdAt', 'DESC']]
        });

        // Normalize
        const normalizedLogs = rows.map(l => ({
            id: l.id,
            source: 'SIMPELL',
            user: l.user ? l.user.nama : 'Unknown',
            action: l.action,
            description: l.description,
            timestamp: l.createdAt,
            original: l
        }));

        const actionRows = await ActivityLog.findAll({
            attributes: ['action'],
            group: ['action'],
            raw: true
        });
        const actions = actionRows.map(row => row.action).filter(Boolean).sort();

        res.render('activity-log/index', {
            title: 'Log Aktivitas SIMPELL',
            logs: normalizedLogs,
            pagination,
            actions,
            query: req.query,
            sidebar: true,
            header: true
        });

    } catch (error) {
        console.error('Error fetching logs:', error);
        req.flash('error_msg', 'Gagal memuat log aktivitas');
        res.redirect('/');
    }
};
