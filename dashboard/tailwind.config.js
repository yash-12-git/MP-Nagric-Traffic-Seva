/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        gov: { blue: '#0b3d91', saffron: '#ff6b00', green: '#2e7d32' },
      },
    },
  },
  plugins: [],
};
