export function canonicalCandidates(selectedText: string) {
  const word = selectedText.trim().toLowerCase().replace(/^[^a-z]+|[^a-z]+$/g, '')
  const candidates = new Set([word])
  if (word.endsWith('ies') && word.length > 4) candidates.add(word.slice(0, -3) + 'y')
  if (word.endsWith('s') && word.length > 3) candidates.add(word.slice(0, -1))
  if (word.endsWith('ed') && word.length > 4) {
    candidates.add(word.slice(0, -2))
    candidates.add(word.slice(0, -1))
  }
  if (word.endsWith('ing') && word.length > 5) {
    candidates.add(word.slice(0, -3))
    candidates.add(word.slice(0, -3) + 'e')
  }
  return [...candidates].filter(Boolean)
}
