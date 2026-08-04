export type EnglishAccent = 'en-GB' | 'en-US'

export interface PronunciationOptions {
  voiceURI?: string
  rate?: number
}

export function canSpeakEnglish() {
  return typeof window !== 'undefined' && 'speechSynthesis' in window && 'SpeechSynthesisUtterance' in window
}

const qualityHints = [
  'natural',
  'premium',
  'enhanced',
  'siri',
  'google',
  'microsoft',
  'samantha',
  'daniel',
  'karen',
  'moira',
  'tessa',
  'ava',
  'alex',
]

function voiceQualityScore(voice: SpeechSynthesisVoice) {
  const name = voice.name.toLowerCase()
  let score = voice.localService ? 8 : 0
  if (voice.default) score += 3
  if (qualityHints.some((hint) => name.includes(hint))) score += 30
  if (name.includes('compact') || name.includes('espeak') || name.includes('eloquence')) score -= 50
  return score
}

export function listEnglishVoices(voices?: SpeechSynthesisVoice[]) {
  const available = voices ?? (canSpeakEnglish() ? window.speechSynthesis.getVoices() : [])
  return available
    .filter((voice) => voice.lang.toLowerCase().startsWith('en'))
    .sort((a, b) => {
      const scoreDifference = voiceQualityScore(b) - voiceQualityScore(a)
      return scoreDifference || a.lang.localeCompare(b.lang) || a.name.localeCompare(b.name)
    })
}

export function selectPreferredEnglishVoice(
  voices: SpeechSynthesisVoice[],
  accent: EnglishAccent,
  preferredVoiceURI?: string,
) {
  const englishVoices = listEnglishVoices(voices)
  const preferred = preferredVoiceURI
    ? englishVoices.find((voice) => voice.voiceURI === preferredVoiceURI)
    : undefined
  if (preferred) return preferred

  const exactAccent = englishVoices.filter(
    (voice) => voice.lang.toLowerCase() === accent.toLowerCase(),
  )
  return exactAccent[0] ?? englishVoices[0]
}

export function speakEnglish(
  text: string,
  accent: EnglishAccent,
  options: PronunciationOptions = {},
) {
  if (!canSpeakEnglish()) return false
  const utterance = new SpeechSynthesisUtterance(text)
  utterance.lang = accent
  utterance.rate = Math.max(0.8, Math.min(1.15, options.rate ?? 0.96))
  utterance.pitch = 1
  const voice = selectPreferredEnglishVoice(
    window.speechSynthesis.getVoices(),
    accent,
    options.voiceURI,
  )
  if (voice) utterance.voice = voice
  window.speechSynthesis.cancel()
  window.speechSynthesis.speak(utterance)
  return true
}
