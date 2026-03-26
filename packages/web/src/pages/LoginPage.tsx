import { useState } from 'react'
import { api, setTokens, ApiError } from '../api'
import type { User } from '@animal-daily/shared'
import styles from './LoginPage.module.css'

interface LoginPageProps {
  onLogin: (user: User) => void
  onGoRegister: () => void
}

export default function LoginPage({ onLogin, onGoRegister }: LoginPageProps) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const data = await api.login(email, password)
      setTokens(data.accessToken, data.refreshToken)
      onLogin(data.user)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : '登录失败')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className={styles.container}>
      <h2 className={styles.heading}>欢迎回来</h2>
      <p className={styles.subtitle}>继续记录你的每一天</p>

      <form className={styles.form} onSubmit={handleSubmit}>
        <div className={styles.fieldGroup}>
          <label className={styles.label}>邮箱</label>
          <input
            className={styles.input}
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>

        <div className={styles.fieldGroup}>
          <label className={styles.label}>密码</label>
          <input
            className={styles.input}
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>

        <button className={styles.submitBtn} type="submit" disabled={loading}>
          {loading ? '登录中...' : '登录'}
        </button>

        {error && <p className={styles.error}>{error}</p>}
      </form>

      <button className={styles.switchLink} onClick={onGoRegister}>
        还没有账号？去注册
      </button>
    </div>
  )
}
