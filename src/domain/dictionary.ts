export interface DictionaryEntry {
  headword: string
  matchedForm: string
  phonetic?: string
  definitions: string[]
  translations: string[]
  partsOfSpeech: string[]
  inflections: Record<string, string>
}

export type DictionaryLookup =
  | { status: 'loading' }
  | { status: 'found'; entry: DictionaryEntry }
  | { status: 'not_found' }
  | { status: 'offline' }

