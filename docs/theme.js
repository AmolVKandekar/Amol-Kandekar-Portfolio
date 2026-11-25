(() => {
  const page = document.documentElement;
  const browserColor = document.querySelector('meta[name="theme-color"]');
  const storageKey = 'amol-portfolio-theme';

  function applyTheme(preference) {
    const theme = preference === 'black' ? 'black' : 'dark';
    page.dataset.theme = theme;
    browserColor.content = theme === 'black' ? '#000000' : '#151515';
    return theme;
  }

  try {
    applyTheme(localStorage.getItem(storageKey));
  } catch {
    applyTheme('dark');
  }

  document.addEventListener('DOMContentLoaded', () => {
    const switcher = document.querySelector('.theme-switch');
    const choices = switcher.querySelectorAll('[data-theme-choice]');

    function selectTheme(preference) {
      const theme = applyTheme(preference);
      for (const choice of choices) {
        choice.setAttribute('aria-pressed', String(choice.dataset.themeChoice === theme));
      }
      return theme;
    }

    selectTheme(page.dataset.theme);
    switcher.hidden = false;

    for (const choice of choices) {
      choice.addEventListener('click', () => {
        const theme = selectTheme(choice.dataset.themeChoice);
        try {
          localStorage.setItem(storageKey, theme);
        } catch {
          // Changing the theme still works during the visit when storage is unavailable.
        }
      });
    }

    window.addEventListener('storage', event => {
      if (event.key === storageKey || event.key === null) selectTheme(event.newValue);
    });
  });
})();
