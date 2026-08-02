import {
  defineConfig,
  minimal2023Preset,
} from '@vite-pwa/assets-generator/config'

const preset = {
  ...minimal2023Preset,
  transparent: { ...minimal2023Preset.transparent, padding: 0 },
  maskable: { ...minimal2023Preset.maskable, padding: 0 },
  apple: { ...minimal2023Preset.apple, padding: 0 },
}

export default defineConfig({
  preset,
  images: ['assets/brand/app-icon-source.jpg'],
})
