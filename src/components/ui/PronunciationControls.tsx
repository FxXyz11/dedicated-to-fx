import { Volume2 } from 'lucide-react'
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
  return (
    <div className={compact ? 'pronunciation pronunciation--compact' : 'pronunciation'}>
      {phonetic && <span className="pronunciation__phonetic">/{phonetic.replace(/^\/+|\/+$/g, '')}/</span>}
      <div className="pronunciation__actions" role="group" aria-label={`${text} 的发音`}>
        <button
          type="button"
          onClick={() => speakEnglish(text, 'en-GB')}
          disabled={!speechAvailable}
          aria-label={`播放 ${text} 的英式发音`}
        >
          <Volume2 size={15} /> UK
        </button>
        <button
          type="button"
          onClick={() => speakEnglish(text, 'en-US')}
          disabled={!speechAvailable}
          aria-label={`播放 ${text} 的美式发音`}
        >
          <Volume2 size={15} /> US
        </button>
      </div>
    </div>
  )
}
