const express = require('express');
const fs = require('fs');
const path = require('path');
const { isAdmin } = require('../middleware/auth');

const router = express.Router();

function escapeHtml(text) {
    return String(text)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
}

function inline(text) {
    return escapeHtml(text)
        .replace(/`([^`]+)`/g, '<code>$1</code>')
        .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
}

function parseChangelog(markdown) {
    const intro = [];
    const releases = [];
    let release = null;
    let group = null;

    markdown.split(/\r?\n/).forEach((line) => {
        const trimmed = line.trim();
        if (!trimmed) return;
        if (trimmed.startsWith('# ')) return;

        if (trimmed.startsWith('## ')) {
            release = { date: trimmed.slice(3).trim(), groups: [] };
            releases.push(release);
            group = null;
            return;
        }
        if (trimmed.startsWith('### ')) {
            if (!release) return;
            group = { title: trimmed.slice(4).trim(), items: [] };
            release.groups.push(group);
            return;
        }
        if (trimmed.startsWith('- ')) {
            const item = inline(trimmed.slice(2).trim());
            if (group) group.items.push(item);
            else if (release) {
                group = { title: '', items: [item] };
                release.groups.push(group);
            }
            return;
        }
        if (!release) intro.push(inline(trimmed));
    });

    return { intro, releases };
}

router.get('/', isAdmin, (req, res) => {
    const file = path.join(__dirname, '..', 'CHANGELOG.md');
    const markdown = fs.readFileSync(file, 'utf8');
    const changelog = parseChangelog(markdown);
    res.render('changelog/index', {
        title: 'Changelog - SIMPELL',
        changelog
    });
});

module.exports = router;
