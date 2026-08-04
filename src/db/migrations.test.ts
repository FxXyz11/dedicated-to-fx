import { describe, expect, it } from 'vitest'
import { defaultPronunciationRate, migrateSettingsToVersion3 } from './migrations'

describe('settings migrations', () => {
  it('adds the natural speech rate without replacing an existing voice choice', () => {
    const migrated = migrateSettingsToVersion3({
      id: 'singleton',
      textScale: 1,
      lineHeight: 1.82,
      reduceMotion: false,
      pronunciationVoiceUs: 'voice-us-natural',
    })

    expect(migrated.pronunciationRate).toBe(defaultPronunciationRate)
    expect(migrated.pronunciationVoiceUs).toBe('voice-us-natural')
  })

  it('keeps a previously selected speech rate', () => {
    const migrated = migrateSettingsToVersion3({
      id: 'singleton',
      textScale: 1,
      lineHeight: 1.82,
      reduceMotion: false,
      pronunciationRate: 1.05,
    })

    expect(migrated.pronunciationRate).toBe(1.05)
  })
})
