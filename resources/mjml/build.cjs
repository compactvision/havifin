// Compiles every top-level *.mjml file in this directory (partials/ is
// skipped since it's a subfolder) into a Blade view under
// resources/views/emails/. Run with `npm run mail:build` after editing
// any .mjml source or partial - the compiled .blade.php files are
// committed, not generated at deploy time.
const fs = require('fs');
const path = require('path');
const mjml2html = require('mjml');

const sourceDir = __dirname;
const outputDir = path.join(__dirname, '..', 'views', 'emails');

async function main() {
    fs.mkdirSync(outputDir, { recursive: true });

    const sourceFiles = fs
        .readdirSync(sourceDir)
        .filter((file) => file.endsWith('.mjml'));

    if (sourceFiles.length === 0) {
        console.log('No .mjml files found in resources/mjml/.');
        return;
    }

    let hadError = false;

    for (const file of sourceFiles) {
        const sourcePath = path.join(sourceDir, file);
        const mjmlSource = fs.readFileSync(sourcePath, 'utf8');

        const { html, errors } = await mjml2html(mjmlSource, {
            filePath: sourcePath,
            validationLevel: 'soft',
            // mj-include is disabled by default since MJML 4.9 (security
            // hardening against arbitrary file inclusion) - our partials
            // are trusted, local, and the whole point of this pipeline.
            ignoreIncludes: false,
        });

        if (errors.length > 0) {
            hadError = true;
            console.error(`Errors while compiling ${file}:`);
            for (const error of errors) {
                console.error(`  - ${error.formattedMessage}`);
            }
            continue;
        }

        const outputName = file.replace(/\.mjml$/, '.blade.php');
        fs.writeFileSync(path.join(outputDir, outputName), html);
        console.log(`Compiled ${file} -> resources/views/emails/${outputName}`);
    }

    process.exitCode = hadError ? 1 : 0;
}

main();
