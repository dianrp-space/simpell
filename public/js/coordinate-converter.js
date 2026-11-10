/**
 * Coordinate Converter Utility
 * Converts DMS (Degrees, Minutes, Seconds) format to Decimal format
 * 
 * Supported DMS formats:
 * - 1° 07' 15.6" N or 1°07'15.6"N
 * - 104° 03' 02.7" E or 104°03'02.7"E
 * - S/W directions result in negative values
 */

(function () {
    'use strict';

    /**
     * Parse DMS string and convert to decimal
     * @param {string} dmsStr - DMS string like "1° 07' 15.6" N"
     * @returns {number|null} - Decimal value or null if parsing failed
     */
    function parseDMS(dmsStr) {
        if (!dmsStr || typeof dmsStr !== 'string') return null;

        // Clean up the string
        dmsStr = dmsStr.trim();

        // If it's already a valid decimal number, return it
        if (/^-?\d+\.?\d*$/.test(dmsStr)) {
            return parseFloat(dmsStr);
        }

        // Try to parse DMS format
        // Pattern: degrees° minutes' seconds" direction
        // Examples: 1° 07' 15.6" N, 104°03'02.7"E, 1°7'15.6"N
        const dmsPattern = /^(-?\d+(?:\.\d+)?)\s*[°]\s*(\d+(?:\.\d+)?)\s*['′]\s*(\d+(?:\.\d+)?)\s*["″]?\s*([NSEWnsew])?$/;

        const match = dmsStr.match(dmsPattern);

        if (!match) {
            // Try alternative pattern without seconds symbol
            const altPattern = /^(-?\d+(?:\.\d+)?)\s*[°]\s*(\d+(?:\.\d+)?)\s*['′]\s*(\d+(?:\.\d+)?)\s*([NSEWnsew])?$/;
            const altMatch = dmsStr.match(altPattern);
            if (!altMatch) return null;
        }

        if (match) {
            const degrees = parseFloat(match[1]);
            const minutes = parseFloat(match[2]);
            const seconds = parseFloat(match[3]);
            const direction = match[4] ? match[4].toUpperCase() : null;

            // Calculate decimal value
            let decimal = Math.abs(degrees) + (minutes / 60) + (seconds / 3600);

            // Apply sign based on direction or original sign
            if (direction === 'S' || direction === 'W') {
                decimal = -decimal;
            } else if (degrees < 0) {
                decimal = -decimal;
            }

            return decimal;
        }

        return null;
    }

    /**
     * Format decimal to display with appropriate precision
     * @param {number} decimal - Decimal coordinate value
     * @returns {string} - Formatted string
     */
    function formatDecimal(decimal) {
        if (decimal === null || isNaN(decimal)) return '';
        // Use high precision (14 decimal places like the example)
        return decimal.toFixed(14).replace(/\.?0+$/, '');
    }

    /**
     * Check if a string looks like DMS format
     * @param {string} str - Input string
     * @returns {boolean}
     */
    function isDMSFormat(str) {
        if (!str) return false;
        return /[°]/.test(str) && /['′]/.test(str);
    }

    /**
     * Initialize converter on an input element
     * @param {HTMLInputElement} input - The input element
     * @param {string} type - 'latitude' or 'longitude'
     */
    function initConverter(input, type) {
        // Ensure input has an ID
        if (!input.id) {
            input.id = 'coord_' + Math.random().toString(36).substr(2, 9);
        }

        // Create helper text element
        const helperId = input.id + '_helper';
        let helper = document.getElementById(helperId);

        if (!helper) {
            helper = document.createElement('p');
            helper.id = helperId;
            helper.className = 'mt-1 text-xs text-gray-500 dark:text-gray-400';

            let exampleDMS = '1° 07\' 15.6" N';
            let exampleDec = '1.121001';

            if (type === 'longitude') {
                exampleDMS = '104° 03\' 02.7" E';
                exampleDec = '104.051525';
            }

            helper.innerHTML = `<span class="text-blue-500">💡</span> Format: <code class="bg-gray-100 dark:bg-gray-700 px-1 rounded">${exampleDMS}</code> atau <code class="bg-gray-100 dark:bg-gray-700 px-1 rounded">${exampleDec}</code>`;
            input.parentNode.appendChild(helper);
        }

        // Create conversion preview element
        const previewId = input.id + '_preview';
        let preview = document.getElementById(previewId);

        if (!preview) {
            preview = document.createElement('p');
            preview.id = previewId;
            preview.className = 'mt-1 text-xs font-medium hidden';
            input.parentNode.appendChild(preview);
        }

        // Handle input changes
        function handleInput() {
            const value = input.value.trim();

            if (!value) {
                preview.classList.add('hidden');
                preview.textContent = '';
                return;
            }

            if (isDMSFormat(value)) {
                const decimal = parseDMS(value);
                if (decimal !== null) {
                    preview.classList.remove('hidden');
                    preview.className = 'mt-1 text-xs font-medium text-green-600 dark:text-green-400';
                    preview.innerHTML = '✓ Akan dikonversi ke: <code class="bg-green-100 dark:bg-green-900 px-1 rounded">' + formatDecimal(decimal) + '</code>';
                } else {
                    preview.classList.remove('hidden');
                    preview.className = 'mt-1 text-xs font-medium text-red-600 dark:text-red-400';
                    preview.textContent = '✗ Format DMS tidak valid';
                }
            } else {
                const num = parseFloat(value);
                if (!isNaN(num)) {
                    preview.classList.add('hidden');
                } else {
                    preview.classList.remove('hidden');
                    preview.className = 'mt-1 text-xs font-medium text-red-600 dark:text-red-400';
                    preview.textContent = '✗ Format koordinat tidak valid';
                }
            }
        }

        // Handle blur - convert DMS to decimal
        function handleBlur() {
            const value = input.value.trim();

            if (isDMSFormat(value)) {
                const decimal = parseDMS(value);
                if (decimal !== null) {
                    input.value = formatDecimal(decimal);
                    preview.classList.add('hidden');

                    // Show brief success feedback
                    const originalPlaceholder = input.placeholder;
                    input.classList.add('ring-2', 'ring-green-500');
                    setTimeout(() => {
                        input.classList.remove('ring-2', 'ring-green-500');
                    }, 1000);
                }
            }
        }

        // Attach event listeners
        input.addEventListener('input', handleInput);
        input.addEventListener('blur', handleBlur);

        // Initial check
        handleInput();
    }

    /**
     * Auto-initialize all coordinate inputs on page load
     */
    function autoInit() {
        // Find latitude inputs
        const latInputs = document.querySelectorAll('input[name="latitude"], input[id="latitude"]');
        latInputs.forEach(function (input) {
            initConverter(input, 'latitude');
        });

        // Find longitude inputs  
        const lngInputs = document.querySelectorAll('input[name="longitude"], input[id="longitude"]');
        lngInputs.forEach(function (input) {
            initConverter(input, 'longitude');
        });
    }

    // Auto-initialize when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', autoInit);
    } else {
        autoInit();
    }

    // Expose functions globally for manual use
    window.CoordinateConverter = {
        parseDMS: parseDMS,
        formatDecimal: formatDecimal,
        isDMSFormat: isDMSFormat,
        initConverter: initConverter
    };

})();
