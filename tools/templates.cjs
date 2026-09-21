const fs = require('node:fs');
const path = require('node:path');
const { META_CSP } = require('./security-config.cjs');
const templateRoot = path.resolve(__dirname, '../src/templates');

function renderPage(source, stack = [], active = '') {
    const rendered = source.replace(/\{\{> ([a-z0-9-]+)(?: active=([a-zA-Z0-9]+))?\}\}/g, (_, name, selected) => {
        if (stack.includes(name)) throw new Error(`Döngülü şablon: ${name}`);
        return renderPage(fs.readFileSync(path.join(templateRoot, name + '.html'), 'utf8'), [...stack, name], selected || active);
    }).replace(/\{\{active:([a-zA-Z0-9]+)\}\}/g, (_, id) => id === active ? ' active' : '');
    if (/\{\{(?:>|active:)/.test(rendered)) throw new Error('Geçersiz şablon ifadesi');
    if (stack.length) return rendered;
    if (!/<head\b/i.test(rendered)) throw new Error('Sayfada head bulunamadı');
    return rendered.replace(/(<meta\s+charset=[^>]+>)/i,
        `$1\n    <meta http-equiv="Content-Security-Policy" content="${META_CSP}">`);
}
module.exports = { renderPage };
