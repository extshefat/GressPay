// Exact source is shared with next.config.ts for CSP hashing.
export const THEME_SCRIPT = `(function(){var t;try{t=localStorage.getItem('gresspay_theme')}catch(e){}var d=t==='dark'||(t!=='light'&&matchMedia('(prefers-color-scheme: dark)').matches);document.documentElement.classList.toggle('dark',d);document.documentElement.style.colorScheme=d?'dark':'light'})();`;
