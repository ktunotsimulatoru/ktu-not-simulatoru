


function initTheme() {
    const saved = localStorage.getItem('ktu-theme');
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const theme = saved || (prefersDark ? 'dark' : 'light');
    applyTheme(theme);
}


function applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    const btn = document.getElementById('themeToggleBtn');
    if (btn) {
        const label = btn.querySelector('.toggle-label');
        if (label) label.textContent = theme === 'dark' ? 'Aydınlık' : 'Karanlık';
    }
    localStorage.setItem('ktu-theme', theme);
}


function toggleTheme() {
    const current = document.documentElement.getAttribute('data-theme') || 'light';
    applyTheme(current === 'dark' ? 'light' : 'dark');
}


initTheme();
export { initTheme, applyTheme, toggleTheme };
