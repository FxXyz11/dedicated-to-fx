import type { DictionaryEntry, DictionaryLookup } from '../domain/dictionary'
import { canonicalCandidates } from '../domain/expression-match'

type CompactDictionaryEntry = [string, string, string, string, string, string]

interface DictionaryShard {
  v: number
  entries: CompactDictionaryEntry[]
}

const shardCache = new Map<string, Map<string, CompactDictionaryEntry>>()

export function normalizeDictionaryWord(value: string) {
  return value.trim().toLowerCase().replace(/^[^a-z]+|[^a-z]+$/g, '')
}

export function dictionaryShardKey(value: string) {
  const letters = normalizeDictionaryWord(value).replace(/[^a-z]/g, '')
  return (letters + '_').slice(0, 2) || '__'
}

function isCompactEntry(value: unknown): value is CompactDictionaryEntry {
  return Array.isArray(value) && value.length === 6 && value.every((item) => typeof item === 'string')
}

export function parseDictionaryShard(value: unknown) {
  if (!value || typeof value !== 'object') return undefined
  const candidate = value as Partial<DictionaryShard>
  if (candidate.v !== 1 || !Array.isArray(candidate.entries) || !candidate.entries.every(isCompactEntry)) {
    return undefined
  }
  return new Map(candidate.entries.map((entry) => [entry[0], entry]))
}

function parseInflections(value: string) {
  const result: Record<string, string> = {}
  value.split('/').forEach((item) => {
    const separator = item.indexOf(':')
    if (separator <= 0) return
    result[item.slice(0, separator)] = item.slice(separator + 1)
  })
  return result
}

function parsePartsOfSpeech(value: string, lexicalLines: string[]) {
  const labels: Record<string, string> = {
    n: 'noun',
    v: 'verb',
    a: 'adjective',
    r: 'adverb',
    c: 'conjunction',
    p: 'preposition',
    d: 'determiner',
    m: 'number',
    x: 'other',
    adj: 'adjective',
    adv: 'adverb',
    prep: 'preposition',
    conj: 'conjunction',
    pron: 'pronoun',
    det: 'determiner',
  }
  const labelled = value
    .split('/')
    .map((item) => item.split(':')[0])
    .map((item) => labels[item] ?? item)
    .filter(Boolean)
  if (labelled.length) return Array.from(new Set(labelled))

  const inferred = lexicalLines
    .map((line) => line.match(/^(n|v|adj|adv|prep|conj|pron|det)\./i)?.[1].toLowerCase())
    .map((item) => item ? labels[item] : undefined)
    .filter((item): item is string => Boolean(item))
  return Array.from(new Set(inferred))
}

function toDictionaryEntry(entry: CompactDictionaryEntry, matchedForm: string): DictionaryEntry {
  const definitions = entry[2].split('\n').filter(Boolean)
  const translations = entry[3].split('\n').filter(Boolean)
  return {
    headword: entry[0],
    matchedForm,
    phonetic: entry[1] || undefined,
    definitions,
    translations,
    partsOfSpeech: parsePartsOfSpeech(entry[4], [...definitions, ...translations]),
    inflections: parseInflections(entry[5]),
  }
}

function dictionaryUrl(key: string) {
  return new URL(`${import.meta.env.BASE_URL}dictionary/${key}.json`, window.location.href).toString()
}

async function loadShard(key: string) {
  const cached = shardCache.get(key)
  if (cached) return cached
  const response = await fetch(dictionaryUrl(key))
  if (!response.ok) return undefined
  const parsed = parseDictionaryShard(await response.json() as unknown)
  if (parsed) shardCache.set(key, parsed)
  return parsed
}

async function findCompactEntry(word: string) {
  const shard = await loadShard(dictionaryShardKey(word))
  return shard?.get(word)
}

export async function lookupDictionaryEntry(selectedText: string): Promise<DictionaryLookup> {
  const normalized = normalizeDictionaryWord(selectedText)
  if (!normalized) return { status: 'not_found' }

  try {
    const exact = await findCompactEntry(normalized)
    if (exact) {
      const exactInflections = parseInflections(exact[5])
      const lemma = exactInflections['0']
      if (lemma && lemma !== normalized) {
        const lemmaEntry = await findCompactEntry(lemma)
        if (lemmaEntry) return { status: 'found', entry: toDictionaryEntry(lemmaEntry, normalized) }
      }
      return { status: 'found', entry: toDictionaryEntry(exact, normalized) }
    }

    for (const candidate of canonicalCandidates(normalized)) {
      if (candidate === normalized) continue
      const entry = await findCompactEntry(candidate)
      if (entry) return { status: 'found', entry: toDictionaryEntry(entry, normalized) }
    }
    return { status: 'not_found' }
  } catch {
    return { status: navigator.onLine ? 'not_found' : 'offline' }
  }
}

export const dictionaryAttribution = {
  name: 'ECDICT',
  url: 'https://github.com/skywind3000/ECDICT',
  license: 'MIT',
  entryCount: 58_226,
} as const

export function clearDictionaryMemoryCache() {
  shardCache.clear()
}
