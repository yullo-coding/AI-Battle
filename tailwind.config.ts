import type { Config } from 'tailwindcss'
import preset from '@vibe/design-system/tailwind.preset'

const config: Config = {
  presets: [preset],
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
}

export default config
