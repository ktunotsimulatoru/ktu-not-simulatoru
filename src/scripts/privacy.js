// Bu sayfa, ana script.js'i (hesaplama araçları + Supabase + Chart.js bağımlılıkları)
        // yüklemeden, sitenin geri kalanıyla aynı localStorage anahtarını ('ktu-theme')
        // kullanarak tema senkronizasyonunu ve footer yılını sağlar.
        (function () {
            function applyTheme(theme) {
                document.documentElement.setAttribute('data-theme', theme);
                var btn = document.getElementById('themeToggleBtn');
                if (btn) {
                    var label = btn.querySelector('.toggle-label');
                    if (label) label.textContent = theme === 'dark' ? 'Aydınlık' : 'Karanlık';
                }
                try { localStorage.setItem('ktu-theme', theme); } catch (e) {}
            }
            function initTheme() {
                var saved = null;
                try { saved = localStorage.getItem('ktu-theme'); } catch (e) {}
                var prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
                applyTheme(saved || (prefersDark ? 'dark' : 'light'));
            }
            function toggleTheme() {
                var current = document.documentElement.getAttribute('data-theme') || 'light';
                applyTheme(current === 'dark' ? 'light' : 'dark');
            }
            initTheme();
            document.addEventListener('DOMContentLoaded', function () {
                var btn = document.getElementById('themeToggleBtn');
                if (btn) btn.addEventListener('click', toggleTheme);
                var telifYiliEl = document.getElementById('telif-yili');
                if (telifYiliEl) {
                    var baslangicYili = 2025;
                    var guncelYil = new Date().getFullYear();
                    telifYiliEl.textContent = guncelYil > baslangicYili ? (baslangicYili + '-' + guncelYil) : String(baslangicYili);
                }
            });
        })();
