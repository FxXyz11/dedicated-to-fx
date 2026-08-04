import { afterEach, describe, expect, it, vi } from 'vitest'
import { speakEnglish } from './pronunciation'

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
    expect(speak).toHaveBeenCalledWith(expect.objectContaining({ text: 'reflection', lang: 'en-GB', rate: 0.82 }))
  })
})
