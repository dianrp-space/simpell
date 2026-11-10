document.addEventListener('DOMContentLoaded', () => {
    const MIN = 48;
    const CAP = 220;

    function storageKey(ths) {
        const heads = ths.map((th) => th.innerText.replace(/\s+/g, ' ').trim()).join('|');
        return 'simpell-col:' + location.pathname + ':' + heads;
    }

    function readSaved(key, count) {
        try {
            const saved = JSON.parse(localStorage.getItem(key) || 'null');
            if (!Array.isArray(saved) || saved.length !== count) return null;
            return saved.map((width) => Math.max(MIN, Number(width) || MIN));
        } catch (error) {
            return null;
        }
    }

    function textWidth(text, style) {
        const probe = document.createElement('span');
        probe.style.cssText = 'position:absolute;left:-9999px;top:0;visibility:hidden;white-space:nowrap;';
        probe.style.fontFamily = style.fontFamily;
        probe.style.fontSize = style.fontSize;
        probe.style.fontWeight = style.fontWeight;
        probe.style.fontStyle = style.fontStyle;
        probe.style.letterSpacing = style.letterSpacing;
        probe.style.textTransform = style.textTransform;
        probe.textContent = text;
        document.body.appendChild(probe);
        const width = probe.offsetWidth;
        probe.remove();
        return width;
    }

    function boxExtra(cell) {
        const style = getComputedStyle(cell);
        return (parseFloat(style.paddingLeft) || 0)
            + (parseFloat(style.paddingRight) || 0)
            + (parseFloat(style.borderLeftWidth) || 0)
            + (parseFloat(style.borderRightWidth) || 0);
    }

    function headerWidth(th) {
        const text = th.innerText.replace(/\s+/g, ' ').trim();
        const style = getComputedStyle(th);
        return Math.ceil(textWidth(text, style) + boxExtra(th) + 16);
    }

    function naturalWidth(table, index) {
        let widest = MIN;
        table.querySelectorAll('tr').forEach((row) => {
            const cell = row.children[index];
            if (!cell || cell.tagName === 'TH' || cell.hasAttribute('colspan')) return;
            const text = cell.innerText.replace(/\s+/g, ' ').trim();
            if (!text) return;
            widest = Math.max(widest, Math.ceil(textWidth(text, getComputedStyle(cell)) + boxExtra(cell)));
        });
        return Math.min(widest, CAP);
    }

    function prepare(table) {
        if (table.dataset.colsReady === '1') return;
        if (table.getBoundingClientRect().width < 20) return;
        const headRow = table.querySelector('thead tr');
        if (!headRow) return;
        const ths = [...headRow.children].filter((cell) => !cell.hasAttribute('colspan'));
        if (ths.length < 2) return;

        const key = storageKey(ths);
        const saved = readSaved(key, ths.length);
        const floors = ths.map((th) => Math.max(MIN, headerWidth(th)));
        const widths = ths.map((th, index) => {
            const floor = floors[index];
            if (saved) return Math.max(floor, saved[index]);
            if (/aksi|action/i.test(th.innerText) || th.querySelector('button, a')) {
                return Math.max(floor, 72, naturalWidth(table, index));
            }
            return Math.max(floor, naturalWidth(table, index));
        });

        let colgroup = table.querySelector(':scope > colgroup');
        if (!colgroup) {
            colgroup = document.createElement('colgroup');
            ths.forEach(() => colgroup.appendChild(document.createElement('col')));
            table.insertBefore(colgroup, table.firstChild);
        }
        const cols = [...colgroup.children];

        function apply() {
            let sum = 0;
            widths.forEach((width, index) => {
                cols[index].style.width = width + 'px';
                sum += width;
            });
            table.style.tableLayout = 'fixed';
            table.style.width = sum + 'px';
            table.classList.add('col-resized');
        }

        ths.forEach((th, index) => {
            if (th.querySelector('.col-resizer')) return;
            const handle = document.createElement('span');
            handle.className = 'col-resizer';
            handle.title = 'Seret untuk mengubah lebar kolom';
            th.appendChild(handle);
            handle.addEventListener('mousedown', (event) => {
                event.preventDefault();
                event.stopPropagation();
                const startX = event.pageX;
                const startWidth = widths[index];
                handle.classList.add('is-active');
                document.body.classList.add('is-col-resizing');

                function move(moveEvent) {
                    widths[index] = Math.max(floors[index], Math.round(startWidth + moveEvent.pageX - startX));
                    apply();
                }

                function up() {
                    document.removeEventListener('mousemove', move);
                    document.removeEventListener('mouseup', up);
                    handle.classList.remove('is-active');
                    document.body.classList.remove('is-col-resizing');
                    localStorage.setItem(key, JSON.stringify(widths));
                }

                document.addEventListener('mousemove', move);
                document.addEventListener('mouseup', up);
            });
        });

        apply();
        table.dataset.colsReady = '1';
    }

    function scan() {
        document.querySelectorAll('.overflow-auto > table, .overflow-x-auto > table').forEach(prepare);
    }

    scan();
    const observer = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
            if (entry.isIntersecting) prepare(entry.target);
        });
    });
    document.querySelectorAll('.overflow-auto > table, .overflow-x-auto > table').forEach((table) => {
        observer.observe(table);
    });
});
