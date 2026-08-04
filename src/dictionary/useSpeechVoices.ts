import { useEffect, useState } from 'react'
import { canSpeakEnglish, listEnglishVoices } from './pronunciation'

export function useSpeechVoices() {
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>(() => listEnglishVoices())

  useEffect(() => {
    if (!canSpeakEnglish()) return
    const synthesis = window.speechSynthesis
    const refresh = () => setVoices(listEnglishVoices(synthesis.getVoices()))
    refresh()
    if (typeof synthesis.addEventListener === 'function') {
      synthesis.addEventListener('voiceschanged', refresh)
      return () => synthesis.removeEventListener('voiceschanged', refresh)
    }
    synthesis.onvoiceschanged = refresh
    return () => {
      if (synthesis.onvoiceschanged === refresh) synthesis.onvoiceschanged = null
    }
  }, [])

  return voices
}
