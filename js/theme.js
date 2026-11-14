// ========================================================================
// SHIIFT X — وحدة المظهر العام (الوضع الليلي والنهاري)
// ========================================================================

function updateThemeIcon(isDark) {
    const icon = document.getElementById('theme-toggle-icon');
    if (!icon) return;
    icon.className = isDark 
        ? "ph-fill ph-sun text-xl text-amber-400" 
        : "ph-fill ph-moon text-xl text-slate-700";
}

function toggleTheme() {
    const html = document.documentElement;
    const icon = document.getElementById('theme-toggle-icon');

    if (icon) icon.classList.add('theme-rotating');

    const isDark = html.classList.toggle('dark');
    try {
        localStorage.setItem('theme', isDark ? 'dark' : 'light');
    } catch (_) {}
    
    updateThemeIcon(isDark);

    if (icon) {
        setTimeout(() => {
            icon.classList.remove('theme-rotating');
        }, 200);
    }
}

// مزامنة الثيم المحفوظ في المتصفح فور تحميل الصفحة
(function initTheme() {
    try {
        const savedTheme = localStorage.getItem('theme');
        const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        const isDark = savedTheme === 'dark' || (!savedTheme && prefersDark);

        document.documentElement.classList.toggle('dark', isDark);
        
        const applyIcon = () => updateThemeIcon(isDark);
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', applyIcon, { once: true });
        } else {
            applyIcon();
        }
    } catch (_) {
        const isDark = document.documentElement.classList.contains('dark');
        updateThemeIcon(isDark);
    }
})();
