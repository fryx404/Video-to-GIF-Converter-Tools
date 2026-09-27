/**
 * Video to GIF Converter — Theme Provider ("fryx404 Pop")
 * テーマ設定（'light' | 'dark' | 'system'）を <html data-theme> に反映し、localStorage に永続化する。
 * 色そのものは src/style.css のトークンが持つ。このファイルは状態の管理だけを担う。
 * 初回描画前に適用するため <head> で同期読み込みすること（Viteのバンドル対象外として public/ に置く）。
 */
const Theme = (() => {
    const STORAGE_KEY = 'video-to-gif-theme';
    const MODES = ['light', 'dark', 'system'];
    const media = window.matchMedia('(prefers-color-scheme: dark)');
    const listeners = new Set();

    function load() {
        try {
            const saved = localStorage.getItem(STORAGE_KEY);
            if (MODES.includes(saved)) return saved;
        } catch (_) { /* ストレージ不可の環境では既定値 */ }
        return 'system';
    }

    let mode = load();

    /** 実際に表示されているテーマ（'light' | 'dark'） */
    function resolved() {
        if (mode === 'system') return media.matches ? 'dark' : 'light';
        return mode;
    }

    function apply() {
        document.documentElement.setAttribute('data-theme', mode);
        listeners.forEach(fn => fn({ mode, resolved: resolved() }));
    }

    function set(next) {
        if (!MODES.includes(next)) return;
        mode = next;
        try { localStorage.setItem(STORAGE_KEY, mode); } catch (_) { /* 保存失敗は無視 */ }
        apply();
    }

    function subscribe(fn) {
        listeners.add(fn);
        return () => listeners.delete(fn);
    }

    // OS側の切り替えに追従（system選択時のみ意味を持つ）
    media.addEventListener('change', () => {
        if (mode === 'system') apply();
    });

    apply();

    return { get: () => mode, resolved, set, subscribe };
})();
window.Theme = Theme;

// ===== テーマ切替UI（[data-theme-value] ボタン群） =====
document.addEventListener('DOMContentLoaded', () => {
    const buttons = document.querySelectorAll('[data-theme-value]');

    function sync({ mode }) {
        buttons.forEach(btn => {
            btn.setAttribute('aria-pressed', String(btn.dataset.themeValue === mode));
        });
    }

    buttons.forEach(btn => {
        btn.addEventListener('click', () => Theme.set(btn.dataset.themeValue));
    });

    Theme.subscribe(sync);
    sync({ mode: Theme.get() });
});
