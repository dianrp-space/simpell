const { ActivityLog } = require('../models');

const logActivity = async (req, action, description, entityType = null, entityId = null) => {
    try {
        await ActivityLog.create({
            user_id: req.session?.user?.id || null,
            action,
            description,
            entity_type: entityType,
            entity_id: entityId,
            ip_address: req.ip || req.connection?.remoteAddress,
            user_agent: req.headers['user-agent']
        });
    } catch (error) {
        console.error('Error logging activity:', error);
    }
};

module.exports = logActivity;
