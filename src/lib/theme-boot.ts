/** Must stay in sync with the CSP hash in next.config.ts. */
export const themeBootScript =
  "(function(){try{var theme=localStorage.getItem('gresspay_theme');var isDark=theme!=='light';if(isDark){document.documentElement.classList.add('dark');document.documentElement.style.colorScheme='dark';}else{document.documentElement.classList.remove('dark');document.documentElement.style.colorScheme='light';}}catch(e){}})();";
