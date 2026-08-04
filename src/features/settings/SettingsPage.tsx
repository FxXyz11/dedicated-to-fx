import { type ChangeEvent, useRef, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { BookOpenText, Download, HardDrive, Smartphone, Upload, Volume2 } from 'lucide-react'
import { dictionaryAttribution } from '../../dictionary/dictionary-service'
import { speakEnglish, type EnglishAccent } from '../../dictionary/pronunciation'
import { useSpeechVoices } from '../../dictionary/useSpeechVoices'
import {
  exportArchive,
  isLearningArchive,
  libraryRepository,
  restoreArchive,
  updateSettings,
} from '../../db/repository'

export function SettingsPage() {
  const settings = useLiveQuery(() => libraryRepository.getSettings(), [])
  const voices = useSpeechVoices()
  const inputRef = useRef<HTMLInputElement>(null)
  const [message, setMessage] = useState<string>()
  const [busy, setBusy] = useState(false)

  const downloadArchive = async () => {
    setBusy(true)
    try {
      const archive = await exportArchive()
      const blob = new Blob([JSON.stringify(archive, null, 2)], {
        type: 'application/json',
      })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download =
        'Dedicated-to-Fx-backup-' + archive.exportedAt.slice(0, 10) + '.json'
      link.click()
      URL.revokeObjectURL(url)
      setMessage('备份已经生成。请把文件保存在你能再次找到的位置。')
    } catch {
      setMessage('这次导出没有完成，请稍后再试。')
    } finally {
      setBusy(false)
    }
  }

  const restoreFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    setBusy(true)
    try {
      const parsed: unknown = JSON.parse(await file.text())
      if (!isLearningArchive(parsed)) {
        setMessage('这不是可识别的 Dedicated to Fx 备份，当前数据没有改变。')
        return
      }
      const approved = window.confirm(
        '恢复会替换这台设备上的阅读记录、本地导入文章、日记和计划。建议先导出当前数据。确定继续吗？',
      )
      if (!approved) return
      await restoreArchive(parsed)
      setMessage('Fx 的手稿、日记和计划已经恢复。')
    } catch {
      setMessage('文件无法读取，当前数据没有改变。')
    } finally {
      setBusy(false)
    }
  }

  if (!settings) return <div className="page-loading">正在读取本地设置…</div>

  const pronunciationRate = settings.pronunciationRate ?? 0.96
  const voicesFor = (accent: EnglishAccent) => {
    const exact = voices.filter((voice) => voice.lang.toLowerCase() === accent.toLowerCase())
    return exact.length ? exact : voices
  }
  const preview = (accent: EnglishAccent) => {
    const voiceURI = accent === 'en-GB'
      ? settings.pronunciationVoiceGb
      : settings.pronunciationVoiceUs
    speakEnglish('A clear voice makes reading easier.', accent, {
      voiceURI,
      rate: pronunciationRate,
    })
  }

  return (
    <div className="settings-page page-stack">
      <header className="page-intro">
        <p className="eyebrow">Settings · your local archive</p>
        <h1>这本手稿，只属于这台设备上的你。</h1>
        <p>没有账号，没有云端记录。请通过备份让长期积累真正留在自己手中。</p>
      </header>

      <section className="settings-section">
        <div className="settings-section__title">
          <span className="settings-icon"><HardDrive size={20} /></span>
          <div>
            <p className="eyebrow">Reading comfort</p>
            <h2>阅读排版</h2>
          </div>
        </div>
        <label className="range-setting">
          <span><strong>正文字号</strong><small>{Math.round(settings.textScale * 100)}%</small></span>
          <input
            type="range"
            min="0.9"
            max="1.25"
            step="0.05"
            value={settings.textScale}
            onChange={(event) => void updateSettings({ textScale: Number(event.target.value) })}
          />
        </label>
        <label className="range-setting">
          <span><strong>英文行间距</strong><small>{settings.lineHeight.toFixed(2)}</small></span>
          <input
            type="range"
            min="1.6"
            max="2.1"
            step="0.05"
            value={settings.lineHeight}
            onChange={(event) => void updateSettings({ lineHeight: Number(event.target.value) })}
          />
        </label>
        <label className="toggle-setting">
          <span><strong>减少动效</strong><small>保留定位提示，减少展开移动。</small></span>
          <input
            type="checkbox"
            checked={settings.reduceMotion}
            onChange={(event) => void updateSettings({ reduceMotion: event.target.checked })}
          />
        </label>
      </section>

      <section className="settings-section">
        <div className="settings-section__title">
          <span className="settings-icon"><BookOpenText size={20} /></span>
          <div>
            <p className="eyebrow">Learning dictionary</p>
            <h2>离线优先的点词解释</h2>
          </div>
        </div>
        <p className="settings-copy">
          收录约 {dictionaryAttribution.entryCount.toLocaleString('zh-CN')} 个常用英汉学习词条，按字母小块加载并缓存。词典给出一般含义；只有专门策划的表达会判断当前语境并连接核心概念。
        </p>
        <div className="voice-settings" id="pronunciation">
          <div className="voice-settings__intro">
            <div><strong>发音声音</strong><small>选择这台设备里听起来最自然的英语声音</small></div>
            <span>{voices.length ? `找到 ${voices.length} 个英语声音` : '使用系统默认声音'}</span>
          </div>
          <div className="voice-setting-grid">
            {(['en-GB', 'en-US'] as const).map((accent) => {
              const settingKey = accent === 'en-GB' ? 'pronunciationVoiceGb' : 'pronunciationVoiceUs'
              const selected = settings[settingKey] ?? ''
              const choices = voicesFor(accent)
              const selectedAvailable = !selected || choices.some((voice) => voice.voiceURI === selected)
              return (
                <label key={accent}>
                  <span><strong>{accent === 'en-GB' ? '英式声音' : '美式声音'}</strong><small>{accent}</small></span>
                  <select
                    value={selected}
                    onChange={(event) => void updateSettings({ [settingKey]: event.target.value || undefined })}
                  >
                    <option value="">自动选择较自然的声音</option>
                    {!selectedAvailable && <option value={selected}>原设备的声音（当前不可用）</option>}
                    {choices.map((voice) => (
                      <option key={voice.voiceURI} value={voice.voiceURI}>
                        {voice.name} · {voice.lang}{voice.localService ? ' · 本机' : ''}
                      </option>
                    ))}
                  </select>
                  <button className="voice-preview" type="button" onClick={() => preview(accent)}>
                    <Volume2 size={16} /> 试听
                  </button>
                </label>
              )
            })}
          </div>
          <label className="voice-rate">
            <span><strong>语速</strong><small>{Math.round(pronunciationRate * 100)}%</small></span>
            <input
              type="range"
              min="0.85"
              max="1.1"
              step="0.05"
              value={pronunciationRate}
              onChange={(event) => void updateSettings({ pronunciationRate: Number(event.target.value) })}
            />
          </label>
        </div>
        <p className="settings-copy dictionary-settings-note">
          <Volume2 size={17} /> 默认语速已调整得更接近正常说话。可用声音由手机或电脑决定；更换设备后，声音名称可能不同，需要重新选择。
        </p>
        <p className="settings-copy">
          词典数据：<a href={dictionaryAttribution.url} target="_blank" rel="noreferrer">{dictionaryAttribution.name}</a> · {dictionaryAttribution.license} License。不是牛津词典原文。
        </p>
      </section>

      <section className="settings-section">
        <div className="settings-section__title">
          <span className="settings-icon"><Download size={20} /></span>
          <div>
            <p className="eyebrow">Data ownership</p>
            <h2>导出与恢复</h2>
          </div>
        </div>
        <p className="settings-copy">
          浏览器或 iPhone 可能清理长期未使用的网站数据。JSON 备份包含阅读学习记录、本地导入文章、私人日记、每日习惯、计划和设置。
        </p>
        <div className="settings-actions">
          <button className="primary-button" type="button" onClick={() => void downloadArchive()} disabled={busy}>
            <Download size={18} /> 导出 Fx 的全部记录
          </button>
          <button className="secondary-button" type="button" onClick={() => inputRef.current?.click()} disabled={busy}>
            <Upload size={18} /> 从备份恢复
          </button>
          <input
            ref={inputRef}
            className="visually-hidden"
            type="file"
            accept="application/json,.json"
            onChange={(event) => void restoreFile(event)}
          />
        </div>
        <p className="backup-date">
          最近备份：{settings.lastBackupAt
            ? new Intl.DateTimeFormat('zh-CN', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(settings.lastBackupAt))
            : '还没有导出过'}
        </p>
        {message && <div className="settings-message" role="status">{message}</div>}
      </section>

      <section className="settings-section">
        <div className="settings-section__title">
          <span className="settings-icon"><Smartphone size={20} /></span>
          <div>
            <p className="eyebrow">iPhone</p>
            <h2>添加到主屏幕</h2>
          </div>
        </div>
        <ol className="install-steps">
          <li><span>1</span>使用 Safari 打开 Dedicated to Fx。</li>
          <li><span>2</span>点击浏览器底部的“分享”。</li>
          <li><span>3</span>选择“添加到主屏幕”。</li>
        </ol>
        <p className="settings-copy">已经访问过的应用外壳与内置文章可离线打开；全部学习记录仍只保存在本机。</p>
      </section>

      <footer className="settings-footer">
        <span className="wordmark__seal">Fx</span>
        <p>Dedicated to Fx · Version 0.7<br />No account. No tracking. No API key.</p>
      </footer>
    </div>
  )
}
