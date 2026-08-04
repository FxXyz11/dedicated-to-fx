import type { AppSettings } from '../domain/models'

export const defaultPronunciationRate = 0.96

export function migrateSettingsToVersion3(settings: AppSettings): AppSettings {
  return {
    ...settings,
    pronunciationRate: settings.pronunciationRate ?? defaultPronunciationRate,
  }
}
