import { afterEach, describe, expect, it, vi } from 'vitest'
import { selectPreferredEnglishVoice, speakEnglish } from './pronunciation'

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('pronunciation', () => {
  it('speaks with the requested English accent', () => {
    class FakeUtterance {
      lang = ''
      rate = 1
      pitch = 1
      voice?: SpeechSynthesisVoice
      constructor(public text: string) {}
    }
    const speak = vi.fn()
    const cancel = vi.fn()
    vi.stubGlobal('SpeechSynthesisUtterance', FakeUtterance)
    Object.defineProperty(window, 'speechSynthesis', {
      configurable: true,
      value: { speak, cancel, getVoices: () => [] },
    })

    expect(speakEnglish('reflection', 'en-GB')).toBe(true)
    expect(cancel).toHaveBeenCalledOnce()
    expect(speak).toHaveBeenCalledWith(expect.objectContaining({ text: 'reflection', lang: 'en-GB', rate: 0.96 }))
  })

  it('prefers a natural voice over a compact voice for the same accent', () => {
    const voices = [
      { name: 'English UK Compact', lang: 'en-GB', voiceURI: 'compact', localService: true, default: true },
      { name: 'Daniel Enhanced', lang: 'en-GB', voiceURI: 'daniel', localService: true, default: false },
    ] as SpeechSynthesisVoice[]

    expect(selectPreferredEnglishVoice(voices, 'en-GB')?.voiceURI).toBe('daniel')
    expect(selectPreferredEnglishVoice(voices, 'en-GB', 'compact')?.voiceURI).toBe('compact')
  })

  it('uses the selected voice and keeps the rate in a safe range', () => {
    const selectedVoice = {
      name: 'Samantha Enhanced', lang: 'en-US', voiceURI: 'samantha', localService: true, default: false,
    } as SpeechSynthesisVoice
    class FakeUtterance {
      lang = ''
      rate = 1
      pitch = 1
      voice?: SpeechSynthesisVoice
      constructor(public text: string) {}
    }
    const speak = vi.fn()
    vi.stubGlobal('SpeechSynthesisUtterance', FakeUtterance)
    Object.defineProperty(window, 'speechSynthesis', {
      configurable: true,
      value: { speak, cancel: vi.fn(), getVoices: () => [selectedVoice] },
    })

    expect(speakEnglish('reflection', 'en-US', { voiceURI: 'samantha', rate: 2 })).toBe(true)
    expect(speak).toHaveBeenCalledWith(expect.objectContaining({ voice: selectedVoice, rate: 1.15 }))
  })
})
