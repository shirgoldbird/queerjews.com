// Theme detection and application
(function() {
  'use strict';
  
  // Function to get the current theme
  function getTheme() {
    try {
      // Check localStorage first
      const savedTheme = localStorage.getItem('theme');
      if (savedTheme === 'dark' || savedTheme === 'light') {
        return savedTheme;
      }
    } catch (e) {
      // localStorage might not be available
      console.warn('localStorage not available, falling back to system preference');
    }
    
    // Fall back to system preference
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }
  
  // Function to apply theme
  function applyTheme(theme) {
    const html = document.documentElement;
    if (theme === 'dark') {
      html.classList.add('dark');
    } else {
      html.classList.remove('dark');
    }
  }
  
  // Apply theme immediately
  const currentTheme = getTheme();
  applyTheme(currentTheme);
  
  // Listen for system theme changes
  const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
  mediaQuery.addEventListener('change', function(e) {
    // Only apply system preference if user hasn't set a preference
    try {
      const savedTheme = localStorage.getItem('theme');
      if (!savedTheme) {
        applyTheme(e.matches ? 'dark' : 'light');
      }
    } catch (e) {
      // If localStorage fails, always follow system preference
      applyTheme(e.matches ? 'dark' : 'light');
    }
  });
  
  // Expose theme functions globally for the toggle component
  window.themeUtils = {
    getTheme,
    applyTheme,
    setTheme: function(theme) {
      try {
        localStorage.setItem('theme', theme);
      } catch (e) {
        console.warn('Could not save theme preference');
      }
      applyTheme(theme);
    }
  };
})(); 