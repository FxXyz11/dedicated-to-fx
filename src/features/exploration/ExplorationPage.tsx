import { useEffect, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { ArrowLeft, ArrowRight, Check, CircleHelp, CornerDownLeft, Layers3 } from 'lucide-react'
import { useNavigate, useParams } from 'react-router-dom'
import { PronunciationControls } from '../../components/ui/PronunciationControls'
import { dictionaryAttribution, lookupDictionaryEntry } from '../../dictionary/dictionary-service'
import {
  libraryRepository,
  revealLevel,
  saveGuess,
  savePracticeAttempt,
} from '../../db/repository'
import type { DictionaryLookup } from '../../domain/dictionary'
import type {
  Article,
  Encounter,
  ExplorationSession,
  ExpressionConcept,
  HintLevel,
} from '../../domain/models'

const nextLabels: Record<number, string> = {
  1: '给我一个语境线索',
  2: '看看结构与搭配',
  3: '用简单英文靠近它',
  4: '确认此处的理解',
  5: '连接核心概念',
  6: '看看其他语境',
  7: '尝试迁移',
}

const basicNextLabels: Record<number, string> = {
  1: '先检查原句线索',
  2: '看看词形与词性',
  3: '用简单英文靠近它',
  4: '查看中文辅助',
  5: '连接已有核心概念',
}

function BasicDictionaryExploration({
  article,
  encounter,
  session,
  concept,
  dictionary,
  guess,
  setGuess,
  returnToReading,
}: {
  article: Article
  encounter: Encounter
  session: ExplorationSession
  concept?: ExpressionConcept
  dictionary: DictionaryLookup
  guess: string
  setGuess: (value: string) => void
  returnToReading: () => Promise<void>
}) {
  const entry = dictionary.status === 'found' ? dictionary.entry : undefined
  const maxLevel = concept ? 6 : 5
  const level = Math.min(session.highestRevealedLevel, maxLevel)

  const revealNext = async () => {
    if (level === 1) await saveGuess(session.id, guess)
    if (level < maxLevel) await revealLevel(session.id, (level + 1) as HintLevel)
  }

  return (
    <div className="exploration-page">
      <header className="explore-toolbar">
        <button className="icon-button" type="button" onClick={() => void returnToReading()} aria-label="返回文章">
          <ArrowLeft size={21} />
        </button>
        <span>{article.title}</span>
        <span className="step-count">{entry ? `${level} / ${maxLevel}` : 'Personal note'}</span>
      </header>
      <main className="explore-column">
        <header className="explore-intro">
          <p className="eyebrow">Explore with a learning dictionary</p>
          <h1>{entry?.headword ?? encounter.selectedText}</h1>
          <PronunciationControls text={encounter.selectedText} phonetic={entry?.phonetic} />
          <blockquote className="source-sentence">{encounter.sentenceText}</blockquote>
          {entry && (
            <div
              className="step-rail step-rail--basic"
              style={{ gridTemplateColumns: `repeat(${maxLevel}, 1fr)` }}
              aria-label={`已展开 ${level} 个提示层级`}
            >
              {Array.from({ length: maxLevel }, (_, index) => (
                <span className={index + 1 <= level ? 'is-filled' : ''} key={index} />
              ))}
            </div>
          )}
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
              placeholder="可以使用英文、中文，或不完整的想法。"
            />
            {dictionary.status === 'loading' && <p className="field-note">正在查找本地学习词典…</p>}
            {dictionary.status === 'offline' && (
              <p className="field-note">这一词库分片还未缓存。联网查询一次后，可以在本机离线复用。</p>
            )}
            {dictionary.status === 'not_found' && (
              <p className="field-note">没有找到可靠词条。它可能是姓名、专有名词、拼写变体或生僻专业词；系统不会伪造解释。</p>
            )}
          </div>
        </section>

        {entry && level >= 2 && (
          <section className="explore-step is-open">
            <div className="step-index">02</div>
            <div>
              <p className="eyebrow">Context clues</p>
              <h2>先不看答案，再读一次原句。</h2>
              <ul className="clue-list">
                <li><CircleHelp size={18} />这个词前后分别连接了什么？</li>
                <li><CircleHelp size={18} />它更像动作、事物、性质，还是连接关系？</li>
              </ul>
            </div>
          </section>
        )}

        {entry && level >= 3 && (
          <section className="explore-step is-open">
            <div className="step-index">03</div>
            <div>
              <p className="eyebrow">Word form & part of speech</p>
              <h2>{entry.matchedForm === entry.headword ? entry.headword : `${entry.matchedForm} → ${entry.headword}`}</h2>
              <PronunciationControls text={encounter.selectedText} phonetic={entry.phonetic} />
              <div className="grammar-grid">
                {(entry.partsOfSpeech.length ? entry.partsOfSpeech : ['part of speech not labelled'])
                  .map((item) => <span key={item}>{item}</span>)}
              </div>
              <p className="field-note">这里显示的是词典中的一般词性，不代表系统已经判断出它在当前句中的具体用法。</p>
            </div>
          </section>
        )}

        {entry && level >= 4 && (
          <section className="explore-step is-open">
            <div className="step-index">04</div>
            <div>
              <p className="eyebrow">Simple English</p>
              <h2>Common dictionary possibilities</h2>
              {entry.definitions.length ? (
                <ul className="dictionary-meaning-list dictionary-meaning-list--english">
                  {entry.definitions.map((definition) => <li key={definition}>{definition}</li>)}
                </ul>
              ) : (
                <p className="muted-copy">这个词条暂时只有中文辅助，没有可靠的简明英文释义。</p>
              )}
            </div>
          </section>
        )}

        {entry && level >= 5 && (
          <section className="explore-step explore-step--meaning is-open">
            <div className="step-index">05</div>
            <div>
              <p className="eyebrow">Chinese support</p>
              <h2>这些是常见含义，不是本句的自动答案。</h2>
              {entry.translations.length ? (
                <ul className="dictionary-meaning-list">
                  {entry.translations.map((translation) => <li key={translation}>{translation}</li>)}
                </ul>
              ) : (
                <p className="muted-copy">这个词条暂时没有中文辅助。</p>
              )}
              <p className="dictionary-boundary">请回到原句，结合主语、宾语和上下文判断哪一种可能成立。</p>
              <small className="dictionary-source">
                基础数据：<a href={dictionaryAttribution.url} target="_blank" rel="noreferrer">{dictionaryAttribution.name}</a> · {dictionaryAttribution.license}
              </small>
            </div>
          </section>
        )}

        {entry && concept && level >= 6 && (
          <section className="explore-step explore-step--concept is-open">
            <div className="step-index">06</div>
            <div>
              <p className="eyebrow"><Layers3 size={15} /> Known core concept</p>
              <h2>{concept.coreConceptEn}</h2>
              <p className="concept-zh">{concept.coreConceptZh}</p>
              <div className="mental-model">{concept.mentalModel}</div>
              <p className="boundary-note">核心概念帮助连接语境，但不能代替对当前句子的判断。</p>
            </div>
          </section>
        )}

        {entry && level < maxLevel ? (
          <button className="primary-button primary-button--wide next-layer" type="button" onClick={() => void revealNext()}>
            {basicNextLabels[level]} <ArrowRight size={18} />
          </button>
        ) : (
          <button className="primary-button primary-button--wide next-layer" type="button" onClick={() => void returnToReading()}>
            保存并回到原文 <CornerDownLeft size={18} />
          </button>
        )}
        <button className="return-link" type="button" onClick={() => void returnToReading()}>
          暂时不继续，保留进度并回到文章
        </button>
      </main>
    </div>
  )
}

export function ExplorationPage() {
  const { encounterId = '' } = useParams()
  const navigate = useNavigate()
  const [guess, setGuess] = useState('')
  const [selectedChoice, setSelectedChoice] = useState<string>()
  const [practiceResult, setPracticeResult] = useState<boolean>()
  const [dictionary, setDictionary] = useState<DictionaryLookup>({ status: 'loading' })

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

  const lookupText = data?.encounter.selectedText
  useEffect(() => {
    if (!lookupText) return
    let active = true
    setDictionary({ status: 'loading' })
    void lookupDictionaryEntry(lookupText).then((result) => {
      if (active) setDictionary(result)
    })
    return () => {
      active = false
    }
  }, [lookupText])

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

  if (!unit) {
    return (
      <BasicDictionaryExploration
        article={article}
        encounter={encounter}
        session={session}
        concept={concept}
        dictionary={dictionary}
        guess={guess}
        setGuess={setGuess}
        returnToReading={returnToReading}
      />
    )
  }

  if (!concept) return <div className="page-loading">这条策划内容缺少核心概念。</div>

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
          <PronunciationControls
            text={encounter.selectedText}
            phonetic={dictionary.status === 'found' ? dictionary.entry.phonetic : undefined}
          />
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
