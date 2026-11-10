const fs = require('fs');
const path = require('path');

const assets = [
    {
        src: './node_modules/preline/dist/preline.js',
        dest: './public/js/preline.js'
    }
];

// Ensure directories exist
const ensureDir = (filePath) => {
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
        console.log(`Created directory: ${dir}`);
    }
};

// Copy assets
assets.forEach(({ src, dest }) => {
    try {
        if (fs.existsSync(src)) {
            ensureDir(dest);
            fs.copyFileSync(src, dest);
            console.log(`✓ Copied: ${src} -> ${dest}`);
        } else {
            console.log(`⚠ Source not found (will be available after npm install): ${src}`);
        }
    } catch (error) {
        console.error(`✗ Error copying ${src}:`, error.message);
    }
});

console.log('Asset copy complete!');
