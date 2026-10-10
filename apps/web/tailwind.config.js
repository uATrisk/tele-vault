/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        page: 'var(--bg-page)',
        surface: 'var(--bg-surface)',
        search: 'var(--bg-search)',
        card: 'var(--bg-card)',
        selected: 'var(--bg-selected)',
        hover: 'var(--bg-hover)',
        'text-primary': 'var(--text-primary)',
        'text-secondary': 'var(--text-secondary)',
        'text-on-selected': 'var(--text-on-selected)',
        divider: 'var(--divider)',
        accent: 'var(--accent)',
        danger: 'var(--danger)'
      },
      borderRadius: {
        panel: '24px',
        card: '16px',
        dialog: '28px'
      },
      boxShadow: {
        menu: 'var(--shadow-menu)',
        dialog: 'var(--shadow-dialog)',
        card: 'var(--shadow-card)',
        fab: 'var(--shadow-fab)',
        'fab-hover': 'var(--shadow-fab-hover)'
      }
    }
  },
  plugins: []
};
