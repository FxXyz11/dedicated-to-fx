import { describe, expect, it } from 'vitest'
import { canonicalCandidates } from './expression-match'

describe('expression matching', () => {
  it('connects common inflections to a possible canonical form', () => {
    expect(canonicalCandidates('reveals')).toContain('reveal')
    expect(canonicalCandidates('disrupted')).toContain('disrupt')
    expect(canonicalCandidates('preserved')).toContain('preserve')
    expect(canonicalCandidates('monitoring')).toContain('monitor')
  })
})
