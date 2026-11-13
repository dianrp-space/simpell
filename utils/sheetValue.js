function cellText(value) {
    if (value == null) return '';
    if (value instanceof Date) {
        const year = value.getFullYear();
        const month = String(value.getMonth() + 1).padStart(2, '0');
        const day = String(value.getDate()).padStart(2, '0');
        return `${day}/${month}/${year}`;
    }
    if (typeof value === 'object') {
        if (Array.isArray(value.richText)) return value.richText.map((part) => part.text || '').join('');
        if (value.text != null && value.text !== '') return String(value.text);
        if (value.result != null && typeof value.result !== 'object') return cellText(value.result);
        if (value.hyperlink) return String(value.text || value.hyperlink);
        return '';
    }
    return String(value);
}

function cleanText(value, max) {
    const text = cellText(value).replace(/\r\n/g, '\n').replace(/\u00a0/g, ' ').trim();
    if (!text || text === '-' || text === '—') return null;
    if (max && text.length > max) return text.slice(0, max);
    return text;
}

function cleanNumber(value) {
    const text = cellText(value).trim();
    if (!text || text === '-' || text === '—') return null;
    const number = Number(text.replace(',', '.'));
    if (!Number.isFinite(number)) return null;
    return Math.trunc(number);
}

function parseDisplayDate(value) {
    const text = cellText(value).trim();
    const slash = text.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    if (slash) {
        return `${slash[3]}-${slash[2].padStart(2, '0')}-${slash[1].padStart(2, '0')}`;
    }
    const iso = text.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}`;
    return null;
}

function likePattern(value) {
    return `%${String(value).replace(/[\\%_]/g, '\\$&')}%`;
}

module.exports = {
    cellText,
    cleanText,
    cleanNumber,
    parseDisplayDate,
    likePattern
};
