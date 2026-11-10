/**
 * Admin notifications: toast for the moment it arrives,
 * and a bell that keeps the ones that were missed.
 */

document.addEventListener('DOMContentLoaded', () => {
    const socket = io();
    const createSound = new Audio('/sounds/create.wav');
    const resetSound = new Audio('/sounds/reset.wav');

    const container = document.createElement('div');
    container.id = 'toast-container';
    container.className = 'fixed top-20 right-5 z-[9999] flex flex-col gap-3 pointer-events-none';
    document.body.appendChild(container);

    const bell = document.getElementById('notifBell');
    const bellBtn = document.getElementById('notifBellBtn');
    const panel = document.getElementById('notifBellPanel');
    const list = document.getElementById('notifBellList');
    const badge = document.getElementById('notifBellBadge');
    const readAllBtn = document.getElementById('notifBellReadAll');
    let items = [];

    function showToast(title, message, type, soundType) {
        const toast = document.createElement('div');
        toast.className = `pointer-events-auto min-w-[300px] p-4 rounded-2xl shadow-2xl border transition-all duration-500 translate-x-full opacity-0 flex items-start gap-3 animate-slide-in
            ${type === 'create' ? 'bg-white dark:bg-gray-800 border-green-100 dark:border-green-900/30' : 'bg-white dark:bg-gray-800 border-red-100 dark:border-red-900/30'}`;

        const iconColor = type === 'create' ? 'text-green-500' : 'text-red-500';
        const bgColor = type === 'create' ? 'bg-green-50 dark:bg-green-900/20' : 'bg-red-50 dark:bg-red-900/20';

        const icon = document.createElement('div');
        icon.className = `flex-shrink-0 w-10 h-10 ${bgColor} rounded-xl flex items-center justify-center ${iconColor}`;
        icon.innerHTML = type === 'create'
            ? '<svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" /></svg>'
            : '<svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-3.307a1 1 0 01.293-.707L10.604 12.01A6 6 0 1121 9z" /></svg>';

        const textWrap = document.createElement('div');
        textWrap.className = 'flex-grow';
        const titleEl = document.createElement('p');
        titleEl.className = 'text-sm font-bold text-gray-900 dark:text-white';
        titleEl.textContent = title;
        const messageEl = document.createElement('p');
        messageEl.className = 'text-xs text-gray-500 dark:text-gray-400 mt-0.5';
        messageEl.textContent = message;
        textWrap.append(titleEl, messageEl);

        const closeBtn = document.createElement('button');
        closeBtn.className = 'text-gray-400 hover:text-gray-600 dark:hover:text-white transition-colors';
        closeBtn.setAttribute('aria-label', 'Tutup');
        closeBtn.innerHTML = '<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" /></svg>';
        toast.append(icon, textWrap, closeBtn);
        container.appendChild(toast);

        setTimeout(() => toast.classList.remove('translate-x-full', 'opacity-0'), 10);

        const sound = soundType === 'create' ? createSound : soundType === 'reset' ? resetSound : null;
        if (sound) sound.play().catch(() => {});

        const removeTimeout = setTimeout(() => {
            toast.classList.add('translate-x-full', 'opacity-0');
            setTimeout(() => toast.remove(), 500);
        }, 8000);

        closeBtn.addEventListener('click', () => {
            clearTimeout(removeTimeout);
            toast.classList.add('translate-x-full', 'opacity-0');
            setTimeout(() => toast.remove(), 500);
        });
    }

    function timeLabel(value) {
        const date = new Date(value);
        if (Number.isNaN(date.getTime())) return '';
        return date.toLocaleString('id-ID', {
            day: '2-digit',
            month: 'short',
            hour: '2-digit',
            minute: '2-digit'
        });
    }

    function renderBell() {
        if (!list || !badge) return;
        const unread = items.filter((item) => !item.read).length;
        if (unread > 0) {
            badge.textContent = unread > 9 ? '9+' : String(unread);
            badge.classList.remove('hidden');
        } else {
            badge.textContent = '';
            badge.classList.add('hidden');
        }
        list.replaceChildren();
        if (!items.length) {
            const empty = document.createElement('p');
            empty.className = 'px-4 py-8 text-center text-sm text-gray-500 dark:text-gray-400';
            empty.textContent = 'Tidak ada notifikasi.';
            list.appendChild(empty);
            return;
        }
        items.forEach((item) => {
            const row = document.createElement(item.link ? 'a' : 'button');
            row.className = 'flex w-full items-start gap-3 px-4 py-3 text-left border-b border-gray-100 dark:border-gray-700 last:border-b-0 hover:bg-gray-50 dark:hover:bg-gray-700/60';
            if (item.link) row.href = item.link;
            const dot = document.createElement('span');
            dot.className = 'mt-1.5 h-2 w-2 flex-shrink-0 rounded-full ' + (item.read ? 'bg-transparent' : 'bg-blue-600');
            const text = document.createElement('span');
            text.className = 'min-w-0 flex-1';
            const titleEl = document.createElement('span');
            titleEl.className = 'block text-sm font-semibold text-gray-900 dark:text-white';
            titleEl.textContent = item.title || '';
            const messageEl = document.createElement('span');
            messageEl.className = 'mt-0.5 block text-xs text-gray-500 dark:text-gray-400';
            messageEl.textContent = item.message || '';
            const timeEl = document.createElement('span');
            timeEl.className = 'mt-1 block text-[11px] text-gray-400 dark:text-gray-500';
            timeEl.textContent = timeLabel(item.createdAt);
            text.append(titleEl, messageEl, timeEl);
            row.append(dot, text);
            row.addEventListener('click', () => {
                if (!item.read) {
                    item.read = true;
                    fetch('/admin/notifications/' + item.id + '/read', { method: 'POST' }).catch(() => {});
                    renderBell();
                }
            });
            list.appendChild(row);
        });
    }

    function upsert(item, toastType) {
        if (!item || !item.id) return;
        const existing = items.find((row) => row.id === item.id);
        if (existing) return;
        items.unshift(item);
        items = items.slice(0, 30);
        renderBell();
        if (toastType) showToast(item.title, item.message, toastType, toastType);
    }

    function setOpen(open) {
        if (!panel || !bellBtn) return;
        panel.classList.toggle('hidden', !open);
        bellBtn.setAttribute('aria-expanded', open ? 'true' : 'false');
    }

    if (bellBtn && panel) {
        bellBtn.addEventListener('click', (event) => {
            event.stopPropagation();
            setOpen(panel.classList.contains('hidden'));
        });
        document.addEventListener('click', (event) => {
            if (bell && !bell.contains(event.target)) setOpen(false);
        });
        document.addEventListener('keydown', (event) => {
            if (event.key === 'Escape') setOpen(false);
        });
    }

    if (readAllBtn) {
        readAllBtn.addEventListener('click', () => {
            items.forEach((item) => { item.read = true; });
            renderBell();
            fetch('/admin/notifications/read-all', { method: 'POST' }).catch(() => {});
        });
    }

    fetch('/admin/notifications')
        .then((res) => res.ok ? res.json() : { items: [] })
        .then((data) => {
            const incoming = Array.isArray(data.items) ? data.items : [];
            const seen = new Set(incoming.map((item) => item.id));
            const extras = items.filter((item) => !seen.has(item.id));
            items = extras.concat(incoming).slice(0, 30);
            renderBell();
        })
        .catch(() => renderBell());

    socket.on('new_account_request', (data) => upsert(data, 'create'));
    socket.on('new_reset_request', (data) => upsert(data, 'reset'));
});

const style = document.createElement('style');
style.textContent = `
    @keyframes slide-in-bottom {
        from { transform: translateX(100%); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
    }
    .animate-slide-in {
        animation: slide-in-bottom 0.5s cubic-bezier(0.16, 1, 0.3, 1) forwards;
    }
    @media (prefers-reduced-motion: reduce) {
        .animate-slide-in { animation: none; }
    }
`;
document.head.appendChild(style);
