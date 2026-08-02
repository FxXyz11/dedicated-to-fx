import { type FormEvent, type ReactNode, useMemo, useState } from 'react'
import { Eye, EyeOff, LockKeyhole } from 'lucide-react'
import {
  getSiteAccessConfig,
  hasStoredAccessGrant,
  storeAccessGrant,
  verifySitePassword,
} from './site-access'

interface AccessGateProps {
  children: ReactNode
}

export function AccessGate({ children }: AccessGateProps) {
  const config = useMemo(() => getSiteAccessConfig(), [])
  const [isGranted, setIsGranted] = useState(() => config ? hasStoredAccessGrant(config) : false)
  const [password, setPassword] = useState('')
  const [isVisible, setIsVisible] = useState(false)
  const [isChecking, setIsChecking] = useState(false)
  const [message, setMessage] = useState('')

  if (!config && import.meta.env.DEV) {
    return children
  }

  if (isGranted) {
    return children
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!config || !password || isChecking) return

    setIsChecking(true)
    setMessage('')

    try {
      const isCorrect = await verifySitePassword(password, config)
      if (!isCorrect) {
        setMessage('密码不正确，请再试一次。')
        setPassword('')
        return
      }

      storeAccessGrant(config)
      setIsGranted(true)
    } catch {
      setMessage('当前浏览器暂时无法完成验证，请刷新后重试。')
    } finally {
      setIsChecking(false)
    }
  }

  if (!config) {
    return (
      <main className="access-gate">
        <section className="access-gate__paper" aria-labelledby="access-title">
          <span className="access-gate__mark" aria-hidden="true">Fx</span>
          <p className="eyebrow">Private manuscript</p>
          <h1 id="access-title">手稿暂时没有打开</h1>
          <p className="access-gate__copy">访问密码尚未完成配置，请稍后再来。</p>
        </section>
      </main>
    )
  }

  return (
    <main className="access-gate">
      <section className="access-gate__paper" aria-labelledby="access-title">
        <div className="access-gate__seal" aria-hidden="true">
          <LockKeyhole size={19} strokeWidth={1.5} />
        </div>
        <p className="eyebrow">Dedicated to Fx</p>
        <h1 id="access-title">打开这本私人手稿</h1>
        <p className="access-gate__copy">请输入访问密码。验证后，这台设备会记住你。</p>

        <form className="access-form" onSubmit={handleSubmit}>
          <label htmlFor="site-password">访问密码</label>
          <div className="access-form__field">
            <input
              id="site-password"
              name="password"
              type={isVisible ? 'text' : 'password'}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              autoComplete="current-password"
              autoFocus
              disabled={isChecking}
              aria-describedby={message ? 'access-message' : undefined}
              aria-invalid={message ? 'true' : undefined}
            />
            <button
              type="button"
              className="access-form__visibility"
              onClick={() => setIsVisible((visible) => !visible)}
              aria-label={isVisible ? '隐藏密码' : '显示密码'}
            >
              {isVisible ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
          <button className="primary-button access-form__submit" type="submit" disabled={!password || isChecking}>
            {isChecking ? '正在验证…' : '进入手稿'}
          </button>
          <p id="access-message" className="access-form__message" aria-live="polite">
            {message}
          </p>
        </form>

        <p className="access-gate__note">换设备或清除浏览器数据后，需要重新输入。</p>
      </section>
    </main>
  )
}
