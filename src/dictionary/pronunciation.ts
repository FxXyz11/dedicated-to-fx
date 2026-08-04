export type EnglishAccent = 'en-GB' | 'en-US'

export function canSpeakEnglish() {
  return typeof window !== 'undefined' && 'speechSynthesis' in window && 'SpeechSynthesisUtterance' in window
}

export function speakEnglish(text: string, accent: EnglishAccent) {
  if (!canSpeakEnglish()) return false
  const utterance = new SpeechSynthesisUtterance(text)
  utterance.lang = accent
  utterance.rate = 0.82
  utterance.pitch = 1
  const exactVoice = window.speechSynthesis
    .getVoices()
    .find((voice) => voice.lang.toLowerCase() === accent.toLowerCase())
  if (exactVoice) utterance.voice = exactVoice
  window.speechSynthesis.cancel()
  window.speechSynthesis.speak(utterance)
  return true
}

