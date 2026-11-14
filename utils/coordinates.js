const TOKEN = /(?:[NSEW]\s*)?[+-]?\d+(?:[.,]\d+)?\s*[°º˚]\s*\d+(?:[.,]\d+)?\s*['′’](?:\s*\d+(?:[.,]\d+)?\s*["″“”]?)?\s*[NSEW]?/gi;

function coordinateError() {
    const error = new Error('Koordinat tidak valid. Isi desimal, misalnya 1.121, atau DMS, misalnya 1° 07\' 15.6" N.');
    error.status = 400;
    return error;
}

function round8(number) {
    return (Math.round(number * 1e8) / 1e8).toFixed(8).replace(/\.?0+$/, '');
}

function parseCoordinate(input) {
    if (input === undefined || input === null) return null;
    let text = String(input).trim();
    if (!text) return null;

    text = text
        .replace(/[º˚]/g, '°')
        .replace(/[′’‘]/g, "'")
        .replace(/[″“”]/g, '"')
        .replace(/\s+/g, ' ')
        .trim();

    let sign = 1;
    const leading = text.match(/^([NSEW])\s+(.+)$/i);
    if (leading) {
        if (/[SW]/i.test(leading[1])) sign = -1;
        text = leading[2].trim();
    }
    const trailing = text.match(/^(.+?)\s*([NSEW])$/i);
    if (trailing) {
        if (/[SW]/i.test(trailing[2])) sign = -1;
        text = trailing[1].trim();
    }

    if (/^[+-]?\d+(?:[.,]\d+)?$/.test(text)) {
        const negative = text.startsWith('-');
        const number = Number(text.replace(',', '.'));
        if (!Number.isFinite(number)) return null;
        return negative ? number : sign * Math.abs(number);
    }

    const dms = text.match(/^([+-]?\d+(?:[.,]\d+)?)\s*°\s*(\d+(?:[.,]\d+)?)(?:\s*'\s*(\d+(?:[.,]\d+)?)?)?\s*"?$/);
    if (!dms) return null;

    const degrees = Number(dms[1].replace(',', '.'));
    const minutes = Number(dms[2].replace(',', '.'));
    const seconds = dms[3] ? Number(dms[3].replace(',', '.')) : 0;
    if (![degrees, minutes, seconds].every(Number.isFinite)) return null;
    if (minutes < 0 || minutes >= 60 || seconds < 0 || seconds >= 60) return null;

    const decimal = Math.abs(degrees) + (minutes / 60) + (seconds / 3600);
    return (degrees < 0 || sign < 0) ? -decimal : decimal;
}

function assertRange(number, axis) {
    if (axis === 'latitude' && (number < -90 || number > 90)) throw coordinateError();
    if (axis === 'longitude' && (number < -180 || number > 180)) throw coordinateError();
}

function decimalCoordinate(value, axis) {
    if (value === undefined || value === null) return null;
    if (typeof value === 'number') {
        if (!Number.isFinite(value)) throw coordinateError();
        assertRange(value, axis);
        return round8(value);
    }
    const text = String(value).trim();
    if (!text) return null;
    const parsed = parseCoordinate(text);
    if (parsed === null) throw coordinateError();
    assertRange(parsed, axis);
    return round8(parsed);
}

function decimalCoordinateText(value) {
    if (value === undefined || value === null) return null;
    const text = String(value).trim();
    if (!text) return null;
    if (!/[°º˚]/.test(text)) return text;

    let failed = false;
    const converted = text.replace(TOKEN, (match) => {
        const parsed = parseCoordinate(match);
        if (parsed === null) {
            failed = true;
            return match;
        }
        return round8(parsed);
    });
    if (failed || /[°º˚]/.test(converted)) throw coordinateError();
    return converted;
}

function mapsHref(value) {
    if (value === undefined || value === null) return '';
    const text = String(value).trim();
    if (!text || text === '-') return '';
    const parts = text.split(/[,;]/).map((part) => part.trim()).filter(Boolean);
    if (parts.length < 2) return '';
    const latitude = Number(parts[0].replace(',', '.'));
    const longitude = Number(parts[1].replace(',', '.'));
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return '';
    if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) return '';
    return `https://www.google.com/maps?q=${latitude},${longitude}`;
}

module.exports = {
    coordinateError,
    parseCoordinate,
    decimalCoordinate,
    decimalCoordinateText,
    mapsHref
};
