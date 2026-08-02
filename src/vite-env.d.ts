/// <reference types="vite/client" />
/// <reference types="vite-plugin-pwa/client" />

interface ImportMetaEnv {
  readonly VITE_SITE_PASSWORD_HASH?: string
  readonly VITE_SITE_PASSWORD_SALT?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
