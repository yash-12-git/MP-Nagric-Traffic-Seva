/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        // Calm paper-civic palette (see the MP Nagrik Traffic Seva design doc).
        paper: '#F4EEE3',
        'paper-light': '#FBF7EF',
        doc: '#FCFAF4',
        navy: '#1C3A57',
        'navy-soft': '#A9C0D6',
        saffron: '#D97A2B',
        green: '#2E6B4F',
        'green-bright': '#2E7D52',
        brick: '#C2554A',
        ink: '#23201A',
        body: '#4a4434',
        muted: '#6F6757',
        muted2: '#8a8170',
        faint: '#a59c8a',
        line: '#E2D8C6',
        'line-soft': '#EFE7D8',
        'line-input': '#DAD0BD',
        amber: { fg: '#9A6512', bg: '#FBEBD2', card: '#FBEFDE', border: '#EAD6BC' },
        // legacy aliases kept so any stray class still resolves
        gov: { blue: '#1C3A57', saffron: '#D97A2B', green: '#2E6B4F' },
      },
      fontFamily: {
        serif: ['"Source Serif 4"', 'Georgia', 'serif'],
        sans: ['Mukta', 'system-ui', '-apple-system', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
