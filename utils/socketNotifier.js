/**
 * Socket Notifier Utility
 * Saves the notice first, then emits it to logged-in admins.
 */

const { ensure } = require('./adminNotifications');

exports.notifyAdmin = (event, data) => {
    ensure(event, data)
        .then(({ item, created }) => {
            if (created && item && global.io) {
                global.io.to('admins').emit(event, item);
            }
        })
        .catch((error) => {
            console.error('[Socket] Gagal menyimpan notifikasi:', error.message);
        });
};
