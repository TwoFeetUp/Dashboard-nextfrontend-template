import type { Config } from 'tailwindcss'
import tailwindcssAnimate from 'tailwindcss-animate'

const config: Config = {
    darkMode: 'class',
    content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
  	extend: {
  		colors: {
  			// TwoFeetUp Brand Colors
  			'tfu-purple': '#414099',
  			'tfu-blue': '#8ed8f8',
  			'tfu-violet': '#8473b5',
  			'tfu-purple-secondary': '#7a7fbd',
  			'tfu-orange': '#faa61a',
  			'tfu-black': '#050034',
  			'tfu-grey': '#f1f2f2',
  			'tfu-dark': '#1a1850',

  			// shadcn/ui CSS variables
  			background: 'hsl(var(--background))',
  			foreground: 'hsl(var(--foreground))',
  			card: {
  				DEFAULT: 'hsl(var(--card))',
  				foreground: 'hsl(var(--card-foreground))'
  			},
  			popover: {
  				DEFAULT: 'hsl(var(--popover))',
  				foreground: 'hsl(var(--popover-foreground))'
  			},
  			primary: {
  				DEFAULT: 'hsl(var(--primary))',
  				foreground: 'hsl(var(--primary-foreground))'
  			},
  			secondary: {
  				DEFAULT: 'hsl(var(--secondary))',
  				foreground: 'hsl(var(--secondary-foreground))'
  			},
  			muted: {
  				DEFAULT: 'hsl(var(--muted))',
  				foreground: 'hsl(var(--muted-foreground))'
  			},
  			accent: {
  				DEFAULT: 'hsl(var(--accent))',
  				foreground: 'hsl(var(--accent-foreground))'
  			},
  			destructive: {
  				DEFAULT: 'hsl(var(--destructive))',
  				foreground: 'hsl(var(--destructive-foreground))'
  			},
  			border: 'hsl(var(--border))',
  			input: 'hsl(var(--input))',
  			ring: 'hsl(var(--ring))',
  			chart: {
  				'1': 'hsl(var(--chart-1))',
  				'2': 'hsl(var(--chart-2))',
  				'3': 'hsl(var(--chart-3))',
  				'4': 'hsl(var(--chart-4))',
  				'5': 'hsl(var(--chart-5))'
  			}
  		},
  		fontFamily: {
  			nunito: ['Nunito', 'sans-serif'],
  		},
  		boxShadow: {
  			'tfu-sm': '0 2px 4px rgba(5, 0, 52, 0.06)',
  			'tfu-md': '0 4px 6px rgba(5, 0, 52, 0.08)',
  			'tfu-lg': '0 8px 16px rgba(5, 0, 52, 0.12)',
  			'tfu-xl': '0 12px 24px rgba(5, 0, 52, 0.16)',
  		},
  		borderRadius: {
  			'tfu': '12px',
  			lg: 'var(--radius)',
  			md: 'calc(var(--radius) - 2px)',
  			sm: 'calc(var(--radius) - 4px)'
  		}
  	}
  },
  plugins: [tailwindcssAnimate],
}
export default config