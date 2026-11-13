const FIBER_COLORS = [
    { key: 'biru', label: 'Biru', hex: '#0070C0', ink: '#FFFFFF' },
    { key: 'oranye', label: 'Oranye', hex: '#FFC000', ink: '#1F2937' },
    { key: 'hijau', label: 'Hijau', hex: '#00B050', ink: '#FFFFFF' },
    { key: 'coklat', label: 'Coklat', hex: '#7C4B23', ink: '#FFFFFF' },
    { key: 'abu', label: 'Abu-abu', hex: '#808080', ink: '#FFFFFF' },
    { key: 'putih', label: 'Putih', hex: '#FFFFFF', ink: '#1F2937' },
    { key: 'merah', label: 'Merah', hex: '#FF0000', ink: '#FFFFFF' },
    { key: 'hitam', label: 'Hitam', hex: '#111111', ink: '#FFFFFF' },
    { key: 'kuning', label: 'Kuning', hex: '#FFFF00', ink: '#1F2937' },
    { key: 'ungu', label: 'Ungu', hex: '#7030A0', ink: '#FFFFFF' },
    { key: 'pink', label: 'Pink', hex: '#FF66CC', ink: '#1F2937' },
    { key: 'aqua', label: 'Aqua', hex: '#00B0F0', ink: '#1F2937' }
];

const BY_PORT = FIBER_COLORS.map((color) => color.key);
const BY_KEY = new Map(FIBER_COLORS.map((color) => [color.key, color]));

function colorByPort(port) {
    const number = Number(port);
    if (!Number.isInteger(number) || number < 1 || number > BY_PORT.length) return null;
    return BY_PORT[number - 1];
}

function findFiberColor(key) {
    return BY_KEY.get(key) || null;
}

function fiberMap() {
    return Object.fromEntries(FIBER_COLORS.map((color) => [color.key, color]));
}

function portColorMap() {
    return Object.fromEntries(BY_PORT.map((key, index) => [String(index + 1), key]));
}

function warnaFromFill(fgColor, port) {
    const fallback = colorByPort(port);
    if (!fgColor) return fallback;
    const argb = String(fgColor.argb || '').toUpperCase();
    if (argb === 'FF0070C0') return 'biru';
    if (argb === 'FFFFC000') return 'oranye';
    if (argb === 'FF00B050') return 'hijau';
    if (argb === 'FFFF0000') return 'merah';
    if (fgColor.theme === 9) return 'coklat';
    if (fgColor.theme === 1) return 'hitam';
    if (fgColor.theme === 0) {
        const tint = Number(fgColor.tint) || 0;
        if (tint < -0.45) return 'abu';
        if (Math.abs(tint) < 0.05) return 'putih';
    }
    return fallback;
}

module.exports = {
    FIBER_COLORS,
    colorByPort,
    findFiberColor,
    fiberMap,
    portColorMap,
    warnaFromFill
};
