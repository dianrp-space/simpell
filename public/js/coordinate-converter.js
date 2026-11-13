/**
 * Menampilkan pratinjau DMS dan mengubahnya ke desimal sebelum form dikirim.
 * Penyimpanan tetap dikonversi di server.
 */
(function () {
    'use strict';

    if (window.__coordConverterLoaded) return;
    window.__coordConverterLoaded = true;

    const TOKEN = /(?:[NSEW]\s*)?[+-]?\d+(?:[.,]\d+)?\s*[°º˚]\s*\d+(?:[.,]\d+)?\s*['′’](?:\s*\d+(?:[.,]\d+)?\s*["″“”]?)?\s*[NSEW]?/gi;

    function parseCoordinate(input) {
        if (!input) return null;
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

    function formatDecimal(decimal) {
        if (decimal === null || !Number.isFinite(decimal)) return '';
        return (Math.round(decimal * 1e8) / 1e8).toFixed(8).replace(/\.?0+$/, '');
    }

    function convertText(value) {
        const text = String(value || '').trim();
        if (!text || !/[°º˚]/.test(text)) return text;
        let failed = false;
        const converted = text.replace(TOKEN, function (match) {
            const parsed = parseCoordinate(match);
            if (parsed === null) {
                failed = true;
                return match;
            }
            return formatDecimal(parsed);
        });
        return failed || /[°º˚]/.test(converted) ? null : converted;
    }

    function initConverter(input, type) {
        if (input.dataset.coordReady === '1') return;
        input.dataset.coordReady = '1';
        if (!input.id) input.id = 'coord_' + Math.random().toString(36).slice(2, 9);

        const helper = document.createElement('p');
        helper.className = 'mt-1 text-xs text-gray-500 dark:text-gray-400';
        const example = type === 'longitude'
            ? '104° 03\' 02.7" E atau 104.05075'
            : (type === 'pair'
                ? '1° 07\' 15.6" N, 104° 03\' 02.7" E atau 1.121, 104.05075'
                : '1° 07\' 15.6" N atau 1.121');
        helper.textContent = 'Format desimal atau DMS. Contoh: ' + example;
        input.parentNode.appendChild(helper);

        const preview = document.createElement('p');
        preview.className = 'mt-1 text-xs font-medium hidden';
        input.parentNode.appendChild(preview);

        function show(ok, message) {
            preview.classList.remove('hidden');
            preview.className = 'mt-1 text-xs font-medium ' + (ok
                ? 'text-green-600 dark:text-green-400'
                : 'text-red-600 dark:text-red-400');
            preview.textContent = message;
        }

        function convertedValue() {
            const value = input.value.trim();
            if (!value) return '';
            if (type === 'pair' || /[°º˚]/.test(value) && value.indexOf(',') !== -1) {
                return convertText(value);
            }
            if (/[°º˚]/.test(value)) {
                const decimal = parseCoordinate(value);
                return decimal === null ? null : formatDecimal(decimal);
            }
            const decimal = parseCoordinate(value);
            return decimal === null ? null : value;
        }

        input.addEventListener('input', function () {
            const value = input.value.trim();
            input.setCustomValidity('');
            if (!value || !/[°º˚]/.test(value)) {
                preview.classList.add('hidden');
                return;
            }
            const next = convertedValue();
            if (next === null) show(false, 'Format koordinat tidak valid');
            else show(true, 'Akan disimpan sebagai ' + next);
        });

        input.addEventListener('blur', function () {
            const next = convertedValue();
            if (next && /[°º˚]/.test(input.value)) {
                input.value = next;
                preview.classList.add('hidden');
            }
        });
    }

    function autoInit() {
        document.querySelectorAll('input[name="latitude"]').forEach(function (input) {
            initConverter(input, 'latitude');
        });
        document.querySelectorAll('input[name="longitude"]').forEach(function (input) {
            initConverter(input, 'longitude');
        });
        document.querySelectorAll('input[name="koordinat"], input[name="lat_long"]').forEach(function (input) {
            initConverter(input, 'pair');
        });
    }

    document.addEventListener('submit', function (event) {
        const form = event.target;
        if (!form || !form.querySelectorAll) return;
        const fields = form.querySelectorAll('input[name="latitude"], input[name="longitude"], input[name="koordinat"], input[name="lat_long"]');
        let invalid = false;
        fields.forEach(function (input) {
            const value = input.value.trim();
            if (!value) return;
            const pair = input.name === 'koordinat' || input.name === 'lat_long';
            const next = pair || (/[°º˚]/.test(value) && value.indexOf(',') !== -1)
                ? convertText(value)
                : (/[°º˚]/.test(value) ? (function () {
                    const decimal = parseCoordinate(value);
                    return decimal === null ? null : formatDecimal(decimal);
                })() : (parseCoordinate(value) === null ? null : value));
            if (next === null) {
                invalid = true;
                input.setCustomValidity('Format koordinat tidak valid');
                input.reportValidity();
            } else if (/[°º˚]/.test(value)) {
                input.value = next;
                input.setCustomValidity('');
            }
        });
        if (invalid) event.preventDefault();
    }, true);

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', autoInit);
    } else {
        autoInit();
    }

    window.CoordinateConverter = {
        parseCoordinate: parseCoordinate,
        formatDecimal: formatDecimal
    };
})();
