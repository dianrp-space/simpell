const express = require('express');
const router = express.Router();
const { isAdmin } = require('../middleware/auth');
const notes = require('../utils/adminNotifications');

router.get('/', isAdmin, async (req, res) => {
    try {
        res.json(await notes.listNotifications());
    } catch (error) {
        console.error('List notifications error:', error);
        res.status(500).json({ items: [], unread: 0 });
    }
});

router.post('/read-all', isAdmin, async (req, res) => {
    try {
        await notes.markAllRead();
        res.json({ ok: true });
    } catch (error) {
        console.error('Mark all notifications error:', error);
        res.status(500).json({ ok: false });
    }
});

router.post('/:id/read', isAdmin, async (req, res) => {
    try {
        await notes.markRead(req.params.id);
        res.json({ ok: true });
    } catch (error) {
        console.error('Mark notification error:', error);
        res.status(500).json({ ok: false });
    }
});

module.exports = router;
