const session = require('express-session');
const { QueryTypes } = require('sequelize');

class DbSessionStore extends session.Store {
    constructor(sequelize) {
        super();
        this.sequelize = sequelize;
    }

    get(sid, callback) {
        this.sequelize.query(
            'SELECT data FROM sessions WHERE sid = ? AND expires > NOW()',
            { replacements: [sid], type: QueryTypes.SELECT }
        ).then((rows) => {
            if (!rows.length) return callback(null, null);
            try {
                callback(null, JSON.parse(rows[0].data));
            } catch (error) {
                callback(error);
            }
        }).catch(callback);
    }

    set(sid, sess, callback) {
        const maxAge = sess.cookie && sess.cookie.maxAge ? sess.cookie.maxAge : 12 * 60 * 60 * 1000;
        const expires = new Date(Date.now() + maxAge);
        this.sequelize.query(
            `INSERT INTO sessions (sid, data, expires) VALUES (?, ?, ?)
             ON DUPLICATE KEY UPDATE data = VALUES(data), expires = VALUES(expires)`,
            { replacements: [sid, JSON.stringify(sess), expires] }
        ).then(() => callback && callback(null)).catch((error) => callback && callback(error));
    }

    destroy(sid, callback) {
        this.sequelize.query(
            'DELETE FROM sessions WHERE sid = ?',
            { replacements: [sid] }
        ).then(() => callback && callback(null)).catch((error) => callback && callback(error));
    }

    touch(sid, sess, callback) {
        this.set(sid, sess, callback);
    }
}

module.exports = DbSessionStore;
