const fs = require('node:fs');
const vm = require('node:vm');
const { execFileSync } = require('node:child_process');
for (const name of ['src/scripts/app.mjs', ...fs.readdirSync('src/scripts/modules').map(name => 'src/scripts/modules/' + name), 'dist/script.min.js',
    'src/scripts/not-kutusu.js', 'dist/not-kutusu.min.js', 'src/scripts/admin-panel.js', 'dist/admin-panel.js',
    'src/scripts/admin-storage.js', 'dist/admin-storage.js', 'src/scripts/event-bindings.js', 'dist/event-bindings.js',
    'src/scripts/course-code.js', 'dist/course-code.js',
    'src/scripts/modal-accessibility.js', 'dist/modal-accessibility.js',
    'src/scripts/privacy.js', 'dist/privacy.js', 'src/scripts/theme-boot.js', 'dist/theme-boot.js',
    'src/scripts/dosya-erisim.js', 'dist/dosya-erisim.js', 'src/scripts/dosya-guvenligi.js', 'dist/dosya-guvenligi.js',
    'dist/vendor-supabase.js', 'dist/vendor-chart.js', 'worker/worker.js']) {
    execFileSync(process.execPath, ['--check', name], { stdio: 'inherit' });
}
let count = 0;
for (const file of fs.readdirSync('src/pages').filter(name => name.endsWith('.html'))) {
    const html = require('./templates.cjs').renderPage(fs.readFileSync('src/pages/' + file, 'utf8'));
    for (const match of html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)) {
        if (/\bsrc\s*=|application\/ld\+json/i.test(match[1])) continue;
        new vm.Script(match[2], { filename: file });
        count++;
    }
    if ((html.includes('script.min.js') || file.startsWith('panel-')) && !html.includes('src="dosya-guvenligi.js"')) {
        throw new Error(`${file}: dosya-guvenligi.js eksik`);
    }
}
console.log(`JavaScript dosyaları ve ${count} inline script: sözdizimi geçerli.`);
