import { useState } from 'react'
import { api, setTokens, ApiError } from '../api'
import type { User } from '@animal-daily/shared'
import styles from './LoginPage.module.css'

interface RegisterPageProps {
  onRegister: (user: User) => void
  onGoLogin: () => void
}

export default function RegisterPage({ onRegister, onGoLogin }: RegisterPageProps) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    if (password !== confirmPassword) {
      setError('两次输入的密码不一致')
      return
    }

    setLoading(true)
    try {
      const data = await api.register(email, password, email.split('@')[0])
      setTokens(data.accessToken, data.refreshToken)
      onRegister(data.user)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : '注册失败')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className={styles.container}>
      <h2 className={styles.heading}>创建账号</h2>
      <p className={styles.subtitle}>开始你的节奏档案</p>

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

        <div className={styles.fieldGroup}>
          <label className={styles.label}>确认密码</label>
          <input
            className={styles.input}
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
          />
        </div>

        <button className={styles.submitBtn} type="submit" disabled={loading}>
          {loading ? '注册中...' : '注册并进入'}
        </button>

        {error && <p className={styles.error}>{error}</p>}
      </form>

      <button className={styles.switchLink} onClick={onGoLogin}>
        已有账号？去登录
      </button>
    </div>
  )
}
