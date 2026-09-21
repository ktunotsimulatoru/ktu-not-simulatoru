// Geçiş köprüsü: inline olaylar kaldırılana kadar eski HTML API adlarını korur.
import * as module0 from './modules/calculation-core.mjs';
import * as module1 from './modules/validation.mjs';
import * as module2 from './modules/calculator-ui.mjs';
import * as module3 from './modules/navigation.mjs';
import * as module4 from './modules/cache.mjs';
import * as module5 from './modules/announcements.mjs';
import * as module6 from './modules/surveys.mjs';
import * as module7 from './modules/theme.mjs';
import * as module8 from './modules/calculator-page.mjs';
import * as module9 from './modules/semester.mjs';
import * as module10 from './modules/statistics.mjs';
import * as module11 from './modules/api.mjs';
import * as module12 from './modules/account.mjs';
import * as module13 from './modules/gallery.mjs';
import * as module14 from './modules/courses.mjs';
import * as module15 from './modules/dom.mjs';
import * as module16 from './modules/game.mjs';
import * as module17 from './modules/gpa-core.mjs';
import * as module18 from './modules/gpa.mjs';
import * as module19 from './modules/error-monitor.mjs';

for (const module of [module0, module1, module2, module3, module4, module5, module6, module7, module8, module9, module10, module11, module12, module13, module14, module15, module16, module17, module18, module19]) {
    for (const name of Object.keys(module)) {
        Object.defineProperty(window, name, { configurable: true, get: () => module[name] });
    }
}
