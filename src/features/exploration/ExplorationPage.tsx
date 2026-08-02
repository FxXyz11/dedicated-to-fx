import { useEffect, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { ArrowLeft, ArrowRight, Check, CircleHelp, CornerDownLeft, Layers3 } from 'lucide-react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  libraryRepository,
  revealLevel,
  saveGuess,
  savePracticeAttempt,
} from '../../db/repository'
import type { HintLevel } from '../../domain/models'

const nextLabels: Record<number, string> = {
  1: '给我一个语境线索',
  2: '看看结构与搭配',
  3: '用简单英文靠近它',
  4: '确认此处的理解',
  5: '连接核心概念',
  6: '看看其他语境',
  7: '尝试迁移',
}

export function ExplorationPage() {
  const { encounterId = '' } = useParams()
  const navigate = useNavigate()
  const [guess, setGuess] = useState('')
  const [selectedChoice, setSelectedChoice] = useState<string>()
  const [practiceResult, setPracticeResult] = useState<boolean>()

  const data = useLiveQuery(async () => {
    const encounter = await libraryRepository.getEncounter(encounterId)
    if (!encounter) return undefined
    const [session, article, unit, concept] = await Promise.all([
      libraryRepository.getSessionForEncounter(encounterId),
      libraryRepository.getArticle(encounter.articleId),
      encounter.learningUnitId ? libraryRepository.getUnit(encounter.learningUnitId) : undefined,
      encounter.expressionConceptId
        ? libraryRepository.getConcept(encounter.expressionConceptId)
        : undefined,
    ])
    return { encounter, session, article, unit, concept }
  }, [encounterId])

  useEffect(() => {
    if (data?.session?.guessText) setGuess(data.session.guessText)
  }, [data?.session?.guessText])

  if (data === undefined) return <div className="page-loading">正在打开探索页…</div>
  if (!data?.session || !data.article) {
    return <div className="page-loading">这条学习记录没有找到。</div>
  }

  const { encounter, session, article, unit, concept } = data
  const level = session.highestRevealedLevel

  const revealNext = async () => {
    if (level === 1) await saveGuess(session.id, guess)
    if (level < 8) await revealLevel(session.id, (level + 1) as HintLevel)
  }

  const returnToReading = async () => {
    await saveGuess(session.id, guess)
    navigate('/read/' + encounter.articleId, {
      state: {
        blockId: encounter.blockId,
        rereadEncounterId: encounter.id,
      },
    })
  }

  const submitPractice = async () => {
    if (!unit || !concept || !selectedChoice) return
    const correct = await savePracticeAttempt({
      encounterId: encounter.id,
      expressionConceptId: concept.id,
      selectedChoiceId: selectedChoice,
      correctChoiceId: unit.transfer.correctChoiceId,
      hintDepth: level,
    })
    setPracticeResult(correct)
  }

  if (!unit || !concept) {
    return (
      <div className="exploration-page">
        <header className="explore-toolbar">
          <button className="icon-button" type="button" onClick={() => void returnToReading()} aria-label="返回文章">
            <ArrowLeft size={21} />
          </button>
          <span>{article.title}</span>
          <span className="step-count">Personal note</span>
        </header>
        <main className="explore-column">
          <p className="eyebrow">A personal trace</p>
          <h1>{encounter.selectedText}</h1>
          <blockquote className="source-sentence">{encounter.sentenceText}</blockquote>
          <section className="explore-step is-open">
            <div className="step-index">01</div>
            <div>
              <p className="eyebrow">Your sense</p>
              <h2>它在这里可能做了什么？</h2>
              <textarea
                value={guess}
                onChange={(event) => setGuess(event.target.value)}
                placeholder="可以使用英文、中文，或不完整的想法。"
              />
              <p className="field-note">
                这条表达尚无当前语境的策划讲解，因此系统不会用不可靠的即时翻译填补空白。
              </p>
            </div>
          </section>
          {concept && level < 6 && (
            <button
              className="secondary-button primary-button--wide"
              type="button"
              onClick={() => { void saveGuess(session.id, guess); void revealLevel(session.id, 6) }}
            >
              查看已有核心概念（不是本句翻译）
            </button>
          )}
          {concept && level >= 6 && (
            <section className="explore-step explore-step--concept is-open">
              <div className="step-index">Concept</div>
              <div>
                <p className="eyebrow"><Layers3 size={15} /> Known core concept</p>
                <h2>{concept.coreConceptEn}</h2>
                <p className="concept-zh">{concept.coreConceptZh}</p>
                <div className="mental-model">{concept.mentalModel}</div>
                <p className="boundary-note">这只能帮助建立跨语境联系，不能替代对当前句子的判断。</p>
              </div>
            </section>
          )}
          <button className="primary-button" type="button" onClick={() => void returnToReading()}>
            保存并回到原文 <CornerDownLeft size={18} />
          </button>
        </main>
      </div>
    )
  }

  return (
    <div className="exploration-page">
      <header className="explore-toolbar">
        <button className="icon-button" type="button" onClick={() => void returnToReading()} aria-label="返回文章">
          <ArrowLeft size={21} />
        </button>
        <span>{article.title}</span>
        <span className="step-count">{level} / 8</span>
      </header>
      <main className="explore-column">
        <header className="explore-intro">
          <p className="eyebrow">Explore in context</p>
          <h1>{concept.canonicalForm}</h1>
          <blockquote className="source-sentence">{unit.sentenceText}</blockquote>
          <div className="step-rail" aria-label={'已展开 ' + level + ' 个提示层级'}>
            {Array.from({ length: 8 }, (_, index) => (
              <span className={index + 1 <= level ? 'is-filled' : ''} key={index} />
            ))}
          </div>
        </header>

        <section className="explore-step is-open">
          <div className="step-index">01</div>
          <div>
            <p className="eyebrow">Your sense</p>
            <h2>它在这里可能做了什么？</h2>
            <textarea
              value={guess}
              onChange={(event) => setGuess(event.target.value)}
              onBlur={() => void saveGuess(session.id, guess)}
              placeholder="不是词典释义。写下你对这句话的感觉。"
            />
            {session.guessRevisions.length > 0 && (
              <p className="field-note">你的第一次判断已保留；现在可以继续修订。</p>
            )}
          </div>
        </section>

        {level >= 2 && (
          <section className="explore-step is-open">
            <div className="step-index">02</div>
            <div>
              <p className="eyebrow">Context clues</p>
              <h2>先让句子给出边界。</h2>
              <ul className="clue-list">
                {unit.contextClues.map((clue) => <li key={clue}><CircleHelp size={18} />{clue}</li>)}
              </ul>
            </div>
          </section>
        )}

        {level >= 3 && (
          <section className="explore-step is-open">
            <div className="step-index">03</div>
            <div>
              <p className="eyebrow">Structure & collocations</p>
              <h2>结构正在缩小可能性。</h2>
              <div className="grammar-grid">
                {unit.grammarAndCollocations.map((item) => <span key={item}>{item}</span>)}
              </div>
            </div>
          </section>
        )}

        {level >= 4 && (
          <section className="explore-step is-open">
            <div className="step-index">04</div>
            <div>
              <p className="eyebrow">Simple English</p>
              <h2 className="english-answer">{unit.simpleEnglishMeaning}</h2>
            </div>
          </section>
        )}

        {level >= 5 && (
          <section className="explore-step is-open explore-step--meaning">
            <div className="step-index">05</div>
            <div>
              <p className="eyebrow">Meaning here</p>
              <h2>{unit.contextualMeaningEn}</h2>
              <details>
                <summary>用中文校准</summary>
                <p>{unit.contextualSupportZh}</p>
              </details>
            </div>
          </section>
        )}

        {level >= 6 && (
          <section className="explore-step is-open explore-step--concept">
            <div className="step-index">06</div>
            <div>
              <p className="eyebrow"><Layers3 size={15} /> Core concept</p>
              <h2>{concept.coreConceptEn}</h2>
              <p className="concept-zh">{concept.coreConceptZh}</p>
              <div className="mental-model">{concept.mentalModel}</div>
              <p className="connection-note"><strong>Here:</strong> {unit.coreConnection}</p>
              <p className="boundary-note">{concept.boundaries[0]}</p>
            </div>
          </section>
        )}

        {level >= 7 && (
          <section className="explore-step is-open">
            <div className="step-index">07</div>
            <div>
              <p className="eyebrow">Across contexts</p>
              <h2>同一个核心动作，进入不同场景。</h2>
              <div className="context-stack">
                {unit.relatedContexts.map((context) => (
                  <article key={context.sentence}>
                    <blockquote>{context.sentence}</blockquote>
                    <p>{context.meaningEn}</p>
                    <small>{context.supportZh}</small>
                    <span>{context.connection}</span>
                  </article>
                ))}
              </div>
            </div>
          </section>
        )}

        {level >= 8 && (
          <section className="explore-step is-open explore-step--practice">
            <div className="step-index">08</div>
            <div>
              <p className="eyebrow">Try a new context</p>
              <h2>{unit.transfer.prompt}</h2>
              <blockquote>{unit.transfer.context}</blockquote>
              <div className="choice-list">
                {unit.transfer.choices.map((choice) => (
                  <label className={selectedChoice === choice.id ? 'choice is-selected' : 'choice'} key={choice.id}>
                    <input
                      type="radio"
                      name="transfer-choice"
                      value={choice.id}
                      checked={selectedChoice === choice.id}
                      onChange={() => {
                        setSelectedChoice(choice.id)
                        setPracticeResult(undefined)
                      }}
                    />
                    <span>{choice.label}</span>
                  </label>
                ))}
              </div>
              {practiceResult === undefined ? (
                <button className="secondary-button" type="button" onClick={() => void submitPractice()} disabled={!selectedChoice}>
                  看看我的判断 <ArrowRight size={17} />
                </button>
              ) : (
                <div className={practiceResult ? 'practice-feedback is-correct' : 'practice-feedback'}>
                  {practiceResult ? <Check size={20} /> : <CircleHelp size={20} />}
                  <p>
                    <strong>{practiceResult ? '这个连接成立。' : '再看一次核心动作。'}</strong>
                    {unit.transfer.feedback}
                  </p>
                </div>
              )}
            </div>
          </section>
        )}

        {level < 8 ? (
          <button className="primary-button primary-button--wide next-layer" type="button" onClick={() => void revealNext()}>
            {nextLabels[level]} <ArrowRight size={18} />
          </button>
        ) : (
          <button className="primary-button primary-button--wide next-layer" type="button" onClick={() => void returnToReading()}>
            回到原文，再读一次 <CornerDownLeft size={18} />
          </button>
        )}
        <button className="return-link" type="button" onClick={() => void returnToReading()}>
          暂时不继续，保留进度并回到文章
        </button>
      </main>
    </div>
  )
}
