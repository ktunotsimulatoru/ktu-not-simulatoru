const esbuild = require('esbuild');
const fs = require('node:fs');
const path = require('node:path');
const { renderPage } = require('./templates.cjs');
const { verifyFiles } = require('./verify-dist.cjs');
const root = path.resolve(__dirname, '..');
const dist = path.resolve(root, 'dist');

function collect(directory, prefix = '') {
    const files = new Map();
    for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
        if (entry.isSymbolicLink()) throw new Error(`Sembolik bağlantı yayınlanamaz: ${entry.name}`);
        const name = prefix + entry.name;
        if (entry.isDirectory()) {
            for (const [key, value] of collect(path.join(directory, entry.name), name + '/')) files.set(key, value);
        } else files.set(name, fs.readFileSync(path.join(directory, entry.name)));
    }
    return files;
}
async function main() {
    const files = collect(path.join(root, 'public'));
    function add(name, data) {
        if (files.has(name)) throw new Error(`Çakışan yayın dosyası: ${name}`);
        files.set(name, Buffer.from(data));
    }
    for (const [name, data] of collect(path.join(root, 'src/pages'))) {
        if (!name.endsWith('.html')) throw new Error(`Sayfa klasöründe beklenmeyen dosya: ${name}`);
        add(name, renderPage(data.toString()));
    }
    for (const [source, output, loader] of [
        
        ['src/scripts/not-kutusu.js', 'not-kutusu.min.js', 'js'],
        ['src/scripts/admin-panel.js', 'admin-panel.js', 'js'],
        ['src/scripts/admin-storage.js', 'admin-storage.js', 'js'],
        ['src/scripts/course-code.js', 'course-code.js', 'js'],
        ['src/scripts/modal-accessibility.js', 'modal-accessibility.js', 'js'],
        ['src/scripts/event-bindings.js', 'event-bindings.js', 'js'],
        ['src/scripts/privacy.js', 'privacy.js', 'js'],
        ['src/scripts/theme-boot.js', 'theme-boot.js', 'js'],
        ['src/scripts/dosya-erisim.js', 'dosya-erisim.js', 'js'],
        ['src/scripts/dosya-guvenligi.js', 'dosya-guvenligi.js', 'js'],
        ['src/styles/style.css', 'style.min.css', 'css'],
        ['src/styles/privacy.css', 'privacy.css', 'css'],
        ['src/styles/admin.css', 'admin.css', 'css']
    ]) {
        const result = await esbuild.transform(fs.readFileSync(path.join(root, source), 'utf8'), {
            loader, minify: true, target: 'es2020', charset: 'utf8', legalComments: 'none', sourcefile: source
        });
        add(output, result.code);
    }
    const bundle = await esbuild.build({
        absWorkingDir: root, entryPoints: [path.join(root, 'src/scripts/app.mjs')], bundle: true,
        format: 'iife', write: false, minify: true, target: 'es2020', charset: 'utf8', legalComments: 'none'
    });
    add('script.min.js', bundle.outputFiles[0].contents);
    for (const [entry, output] of [
        ['src/scripts/vendor-supabase.mjs', 'vendor-supabase.js'],
        ['src/scripts/vendor-chart.mjs', 'vendor-chart.js']
    ]) {
        const vendor = await esbuild.build({ absWorkingDir: root, entryPoints: [path.join(root, entry)], bundle: true,
            format: 'iife', write: false, minify: true, target: 'es2020', charset: 'utf8', legalComments: 'none' });
        add(output, vendor.outputFiles[0].contents);
    }
    verifyFiles(files);
    // Yalnızca bu projenin ürettiği dist klasörü yeniden oluşturulabilir.
    if (path.dirname(dist) !== root || path.basename(dist) !== 'dist') throw new Error('Güvensiz çıktı yolu');
    if (fs.existsSync(dist)) {
        if (fs.lstatSync(dist).isSymbolicLink() || !fs.existsSync(path.join(dist, '.build-output'))) {
            throw new Error('dist bu derleyiciye ait değil; içeriğini incelemeden silmeyin.');
        }
        fs.rmSync(dist, { recursive: true });
    }
    fs.mkdirSync(dist);
    fs.writeFileSync(path.join(dist, '.build-output'), 'ktu-not-simulatoru generated files; do not edit\n');
    let bytes = 0;
    for (const [name, data] of files) {
        const target = path.resolve(dist, name);
        if (!target.startsWith(dist + path.sep)) throw new Error('Güvensiz dosya yolu');
        fs.mkdirSync(path.dirname(target), { recursive: true });
        fs.writeFileSync(target, data);
        bytes += data.length;
    }
    console.log(`dist hazır: ${files.size} yayın dosyası, ${(bytes / 1024 / 1024).toFixed(2)} MB. Yerel dosya bağlantıları doğrulandı.`);
}
main().catch(error => { console.error(error); process.exitCode = 1; });
