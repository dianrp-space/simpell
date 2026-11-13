const MENUS = [
    { key: 'dashboard', label: 'Dashboard', prefix: '/dashboard', group: 'Menu Dashboard' },
    { key: 'pelanggan', label: 'Data Customer', prefix: '/pelanggan', group: 'Menu Dashboard' },
    { key: 'record-ggn', label: 'Record GGN & PM', prefix: '/record-ggn', group: 'Ticket & Monitoring' },
    { key: 'pending-ggn', label: 'Pendingan GGN & PM', prefix: '/pending-ggn', group: 'Ticket & Monitoring' },
    { key: 'qc-psb', label: 'QC PSB & Project', prefix: '/qc-psb', group: 'Ticket & Monitoring' },
    { key: 'ms-fo', label: 'Data MS FO Kepri', prefix: '/ms-fo', group: 'Manage Service FO Kepri' },
    { key: 'pending-ms-fo', label: 'Pendingan MS FO Kepri', prefix: '/pending-ms-fo', group: 'Manage Service FO Kepri' },
    { key: 'pm-ms-fo', label: 'Data PM MS FO Kepri', prefix: '/pm-ms-fo', group: 'Manage Service FO Kepri' },
    { key: 'akses-fo', label: 'Akses FO', prefix: '/akses-fo', group: 'Akses Network' },
    { key: 'akses-fo-p2p', label: 'P2P/FO Core', prefix: '/akses-fo-p2p', group: 'Akses Network' },
    { key: 'akses-direct-lan', label: 'Direct LAN', prefix: '/akses-direct-lan', group: 'Akses Network' },
    { key: 'akses-fo-xconnect', label: 'FO Xconnect', prefix: '/akses-fo-xconnect', group: 'Akses Network' },
    { key: 'akses-vsat-starlink', label: 'Starlink', prefix: '/akses-vsat-starlink', group: 'Akses Network' },
    { key: 'akses-vsat-tdma', label: 'VSAT TDMA / SCPC', prefix: '/akses-vsat-tdma', group: 'Akses Network' },
    { key: 'radio-link', label: 'Radio Link', prefix: '/radio-link', group: 'Akses Network' },
    { key: 'akses-m2m', label: 'Backup M2M', prefix: '/akses-m2m', group: 'Akses Network' },
    { key: 'akses-soltem', label: 'Soltemp', prefix: '/akses-soltem', group: 'Akses Network' },
    { key: 'cpe', label: 'CPE/SDWAN', prefix: '/cpe', group: 'Akses Network' },
    { key: 'akses-third-party', label: '3rd Party', prefix: '/akses-third-party', group: 'Akses Network' },
    { key: 'data-odp', label: 'Data ODP', prefix: '/data-odp', group: 'Data FO Kepri' },
    { key: 'data-hh', label: 'Data HH', prefix: '/data-hh', group: 'Data FO Kepri' },
    { key: 'data-closure', label: 'Data Closure', prefix: '/data-closure', group: 'Data FO Kepri' },
    { key: 'otb-phd', label: 'Data OTB', prefix: '/otb-phd', group: 'Data FO Kepri' },
    { key: 'data-core-project', label: 'Data Core Project', prefix: '/data-core-project', group: 'Data FO Kepri' },
    { key: 'odc', label: 'Data ODC', prefix: '/odc', group: 'Data FO Kepri' },
    { key: 'data-spliter', label: 'Data Spliter', prefix: '/data-spliter', group: 'Data FO Kepri' },
    { key: 'data-core-remote', label: 'Data Core Remote', prefix: '/data-core-remote', group: 'Data FO Kepri' },
    { key: 'data-core-trunk', label: 'Data Core Trunk', prefix: '/data-core-trunk', group: 'Data FO Kepri' }
];

const MENU_KEYS = new Set(MENUS.map((menu) => menu.key));
const BY_LENGTH = [...MENUS].sort((a, b) => b.prefix.length - a.prefix.length);

function pathMatches(path, prefix) {
    return path === prefix || path.startsWith(prefix + '/');
}

function matchMenu(path) {
    if (path === '/export-dashboard') {
        return MENUS.find((menu) => menu.key === 'dashboard');
    }
    return BY_LENGTH.find((menu) => pathMatches(path, menu.prefix)) || null;
}

function isOpenPath(path) {
    return path === '/'
        || path === '/portal'
        || path === '/profile'
        || path.startsWith('/profile/')
        || path === '/auth'
        || path.startsWith('/auth/');
}

function normalizeMenus(value) {
    let list = value;
    if (typeof list === 'string') {
        try {
            list = JSON.parse(list);
        } catch (error) {
            list = [];
        }
    }
    if (!Array.isArray(list)) return [];
    return list.filter((key) => MENU_KEYS.has(key));
}

function parseMenuSelection(body, role) {
    if (role !== 'mitra') return null;
    return normalizeMenus(body.allowed_menus);
}

module.exports = {
    MENUS,
    matchMenu,
    isOpenPath,
    normalizeMenus,
    parseMenuSelection
};
