import { Volume2 } from 'lucide-react'
import { useLiveQuery } from 'dexie-react-hooks'
import { libraryRepository } from '../../db/repository'
import { canSpeakEnglish, speakEnglish } from '../../dictionary/pronunciation'

export function PronunciationControls({
  text,
  phonetic,
  compact = false,
}: {
  text: string
  phonetic?: string
  compact?: boolean
}) {
  const speechAvailable = canSpeakEnglish()
  const settings = useLiveQuery(() => libraryRepository.getSettings(), [])
  return (
    <div className={compact ? 'pronunciation pronunciation--compact' : 'pronunciation'}>
      {phonetic && <span className="pronunciation__phonetic">/{phonetic.replace(/^\/+|\/+$/g, '')}/</span>}
      <div className="pronunciation__actions" role="group" aria-label={`${text} 的发音`}>
        <button
          type="button"
          onClick={() => speakEnglish(text, 'en-GB', {
            voiceURI: settings?.pronunciationVoiceGb,
            rate: settings?.pronunciationRate,
          })}
          disabled={!speechAvailable}
          aria-label={`播放 ${text} 的英式发音`}
        >
          <Volume2 size={15} /> UK
        </button>
        <button
          type="button"
          onClick={() => speakEnglish(text, 'en-US', {
            voiceURI: settings?.pronunciationVoiceUs,
            rate: settings?.pronunciationRate,
          })}
          disabled={!speechAvailable}
          aria-label={`播放 ${text} 的美式发音`}
        >
          <Volume2 size={15} /> US
        </button>
      </div>
    </div>
  )
}
