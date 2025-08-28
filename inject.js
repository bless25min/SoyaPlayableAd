const fs = require('fs').promises;
const path = require('path');
const htmlMinifier = require('html-minifier-terser');

const SRC_DIR = 'src';
const DIST_DIR = 'dist';
const CSS_DIR = path.join(SRC_DIR, 'css');
const MINIFIED_BUNDLE_FILE = path.join(DIST_DIR, 'bundle.min.js');
const DATA_FILE = 'XAUUSD_M15.csv';

async function inject() {
    try {
        console.log('Starting injection and finalization process...');

        // 1. Ensure dist directory exists
        await fs.mkdir(DIST_DIR, { recursive: true });

        // 2. Read the final minified JavaScript code
        const finalJsCode = await fs.readFile(MINIFIED_BUNDLE_FILE, 'utf-8');

        // 3. Read the source CSS
        const cssContent = await fs.readFile(path.join(CSS_DIR, 'style.css'), 'utf-8');

        // 4. Read the source HTML template
        const htmlContent = await fs.readFile(path.join(SRC_DIR, 'index.html'), 'utf-8');

        // 5. Inject CSS and JS into the HTML
        // Replace the external CSS link with an inline <style> tag
        let processedHtml = htmlContent.replace(/<link rel="stylesheet"[^>]*>/, `<style>${cssContent}</style>`);

        // Replace the single script tag placeholder with the final, inlined, obfuscated code
        processedHtml = processedHtml.replace(/<script src="js\/security.js"><\/script>/, `<script>${finalJsCode}</script>`);

        // 6. Minify the final combined HTML
        const minifiedHtml = await htmlMinifier.minify(processedHtml, {
            removeComments: true,
            collapseWhitespace: true,
            minifyJS: true, // This will minify the injected script again, which is fine.
            minifyCSS: true, // This will minify the injected css.
            removeAttributeQuotes: true,
            removeEmptyAttributes: true,
            html5: true,
        });

        // 7. Write the final index.html to the dist directory
        await fs.writeFile(path.join(DIST_DIR, 'index.html'), minifiedHtml);
        console.log(`Final 'index.html' created in '${DIST_DIR}'.`);

        // 8. Copy the data file
        await fs.copyFile(DATA_FILE, path.join(DIST_DIR, DATA_FILE));
        console.log(`'${DATA_FILE}' copied to '${DIST_DIR}'.`);

        // 9. Clean up intermediate build files
        await fs.unlink(path.join(DIST_DIR, 'bundle.js'));
        await fs.unlink(MINIFIED_BUNDLE_FILE);
        console.log('Cleaned up temporary files.');

        console.log('\nInjection process completed successfully!');

    } catch (error) {
        console.error('\nInjection script failed:');
        console.error(error);
        process.exit(1);
    }
}

inject();
