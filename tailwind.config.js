/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            colors: {
                'neumo-bg': '#E0E5EC',
                'neumo-light': '#ffffff',
                'neumo-shadow': '#b8bec7',
                'neumo-brand': '#6366F1',
            },
            boxShadow: {
                'neumo-raised': '8px 8px 16px #b8bec7, -8px -8px 16px #ffffff',
                'neumo-pressed': 'inset 2px 2px 5px #b8bec7, inset -2px -2px 5px #ffffff',
                'neumo-flat': '2px 2px 5px #b8bec7, -2px -2px 5px #ffffff',
            },
            borderRadius: {
                '3xl': '1.5rem',
                '4xl': '2rem',
            }
        },
    },
    plugins: [
        require('@tailwindcss/typography'),
    ],
}
