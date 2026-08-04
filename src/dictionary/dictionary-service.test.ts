import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  clearDictionaryMemoryCache,
  dictionaryShardKey,
  lookupDictionaryEntry,
  parseDictionaryShard,
} from './dictionary-service'

afterEach(() => {
  clearDictionaryMemoryCache()
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

describe('learning dictionary service', () => {
  it('uses stable two-letter shards for word forms', () => {
    expect(dictionaryShardKey('Reflected')).toBe('re')
    expect(dictionaryShardKey("Fx's")).toBe('fx')
    expect(dictionaryShardKey('I')).toBe('i_')
  })

  it('rejects malformed external shard data', () => {
    expect(parseDictionaryShard({ v: 1, entries: [['word']] })).toBeUndefined()
    expect(parseDictionaryShard({ v: 2, entries: [] })).toBeUndefined()
  })

  it('resolves an inflected form to its headword', async () => {
    const payload = {
      v: 1,
      entries: [
        ['reflect', 'rɪˈflekt', 'v. to show or send something back', 'v. 映出；体现；认真思考', '', 'p:reflected/d:reflected'],
        ['reflected', 'rɪˈflektɪd', '', 'v. reflect 的过去式和过去分词', '', '0:reflect'],
      ],
    }
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => payload }))

    const result = await lookupDictionaryEntry('Reflected')

    expect(result.status).toBe('found')
    if (result.status !== 'found') return
    expect(result.entry.headword).toBe('reflect')
    expect(result.entry.matchedForm).toBe('reflected')
    expect(result.entry.partsOfSpeech).toEqual(['verb'])
    expect(result.entry.translations[0]).toContain('映出')
    expect(fetch).toHaveBeenCalledTimes(1)
  })

  it('returns a clear result when a word is absent', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => ({ v: 1, entries: [] }) }))
    await expect(lookupDictionaryEntry('fxnotaword')).resolves.toEqual({ status: 'not_found' })
  })
})
