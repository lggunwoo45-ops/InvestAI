import { useEffect, useRef, useState, type FormEvent } from 'react'
import { cloudRequest, refreshMember, type Member } from '@/services/cloud/cloudClient'
import { passwordChecks, passwordHint, validNewPassword } from '../../../../backend/cloud/passwordPolicy.mjs'
import styles from './MemberAccount.module.css'

interface Challenge { challenge: string; expiresAt: number }
const errorText = (error: unknown) => error instanceof Error ? error.message : '요청을 완료하지 못했습니다.'
const requestMessage = '요청을 접수했습니다. 사용할 수 있는 이메일이면 인증번호가 발송됩니다. 스팸함도 확인하고, 도착하지 않으면 1분 뒤 다시 요청해주세요.'
export function PasswordRules({ password }: { password: string }) {
  const checks = passwordChecks(password)
  return <ul className={styles.passwordRules} aria-label="비밀번호 조건">{([['length', '8~128자'], ['uppercase', '영문 대문자'], ['number', '숫자'], ['special', '특수문자 (예: ! @ #)']] as const).map(([key, label]) => <li key={key} data-met={checks[key]}>{checks[key] ? '✓' : '○'} {label}{checks[key] ? ' 충족' : ''}</li>)}</ul>
}
export function SignupEmail({ username, onTicket }: { username: string; onTicket: (ticket: string) => void }) {
  return <SignupEmailForm key={username} username={username} onTicket={onTicket} />
}
function SignupEmailForm({ username, onTicket }: { username: string; onTicket: (ticket: string) => void }) {
  const [email, setEmail] = useState(''), [code, setCode] = useState(''), [challenge, setChallenge] = useState<Challenge | null>(null)
  const [verified, setVerified] = useState(false), [busy, setBusy] = useState(false), [error, setError] = useState(''), [message, setMessage] = useState('')
  const revision = useRef(0), mounted = useRef(true)
  useEffect(() => {
    mounted.current = true
    return () => { mounted.current = false }
  }, [])
  const request = async () => {
    if (!/^[a-zA-Z0-9_-]{4,32}$/.test(username)) { setError('아이디를 먼저 입력해주세요.'); return }
    const current = revision.current
    setBusy(true); setError(''); setMessage(''); setVerified(false); onTicket('')
    try {
      const value = await cloudRequest<Challenge>('/email/signup/request', { username, email })
      if (!mounted.current || current !== revision.current) return
      setChallenge(value); setCode(''); setMessage(requestMessage)
    } catch (error) { if (mounted.current && current === revision.current) setError(errorText(error)) }
    finally { if (mounted.current && current === revision.current) setBusy(false) }
  }
  const verify = async () => {
    if (!challenge) return
    const current = revision.current
    setBusy(true); setError('')
    try {
      const value = await cloudRequest<{ ticket: string }>('/email/signup/verify', { challenge: challenge.challenge, code })
      if (!mounted.current || current !== revision.current) return
      setVerified(true); setCode(''); setMessage('이메일 인증이 완료됐어요. 아래에서 가입을 마쳐주세요.'); onTicket(value.ticket)
    } catch (error) { if (mounted.current && current === revision.current) setError(errorText(error)) }
    finally { if (mounted.current && current === revision.current) setBusy(false) }
  }
  return <div className={styles.emailBox}>
    <label>이메일<input type="email" autoComplete="email" maxLength={254} required disabled={busy} value={email} onChange={e => { revision.current++; setEmail(e.target.value); setChallenge(null); setVerified(false); setMessage(''); onTicket('') }} /></label>
    <small>가입과 계정 복구에 사용할 본인 이메일을 인증해주세요.</small>
    {!verified && <button type="button" disabled={busy || !email} onClick={() => void request()}>{challenge ? '인증메일 다시 요청' : '인증번호 받기'}</button>}
    {challenge && !verified && <><label>이메일 인증번호<input inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{8}" maxLength={8} value={code} disabled={busy} onChange={e => setCode(e.target.value)} /><small>메일에 적힌 8자리 번호를 10분 안에 입력해주세요.</small></label><button type="button" disabled={busy || !/^\d{8}$/.test(code)} onClick={() => void verify()}>이메일 인증하기</button></>}
    {error && <p role="alert">{error}</p>}{message && <p role="status">{message}</p>}
  </div>
}
export function MemberEmail({ user, available }: { user: Member; available: boolean }) {
  const [email, setEmail] = useState(''), [password, setPassword] = useState(''), [code, setCode] = useState(''), [challenge, setChallenge] = useState<Challenge | null>(null)
  const [busy, setBusy] = useState(false), [error, setError] = useState(''), [message, setMessage] = useState('')
  const request = async () => {
    setBusy(true); setError(''); setMessage('')
    try { setChallenge(await cloudRequest<Challenge>('/email/link/request', { email, password })); setPassword(''); setCode(''); setMessage(requestMessage) }
    catch (error) { setError(errorText(error)) } finally { setBusy(false) }
  }
  const verify = async (event: FormEvent) => {
    event.preventDefault(); if (!challenge) return
    setBusy(true); setError('')
    try { await cloudRequest('/email/link/verify', { challenge: challenge.challenge, code }); await refreshMember(); setCode(''); setChallenge(null); setMessage('이메일 연결이 완료됐어요.') }
    catch (error) { setError(errorText(error)) } finally { setBusy(false) }
  }
  return <section><h3>이메일과 계정 복구</h3>
    {user.email && user.emailVerifiedAt ? <p><strong>{user.email}</strong><br />{available?'인증 완료 · 비밀번호를 잊으면 이 이메일로 재설정할 수 있어요.':'인증된 이메일입니다. 현재 메일 발송은 준비 중이므로 복구 코드를 이용해주세요.'}</p> : !available ? <p>인증메일 발송은 준비 중입니다. 현재는 가입할 때 받은 복구 코드로 비밀번호를 재설정할 수 있어요.</p> : <form className={styles.form} onSubmit={verify}>
      <p>기존 기록을 유지하면서 본인 이메일을 연결하세요. 현재 비밀번호와 이메일 인증번호가 필요합니다.</p>
      <label>연결할 이메일<input type="email" autoComplete="email" required maxLength={254} disabled={busy || !!challenge} value={email} onChange={e => setEmail(e.target.value)} /></label>
      {!challenge ? <><label>현재 비밀번호<input type="password" autoComplete="current-password" maxLength={128} disabled={busy} value={password} onChange={e => setPassword(e.target.value)} /></label><button type="button" disabled={busy || !password || !email} onClick={() => void request()}>연결 인증번호 받기</button></> : <>
        <label>연결 인증번호<input inputMode="numeric" autoComplete="one-time-code" required pattern="[0-9]{8}" maxLength={8} disabled={busy} value={code} onChange={e => setCode(e.target.value)} /><small>8자리 번호 · 요청 후 10분 동안 유효합니다.</small></label>
        <button type="submit" disabled={busy}>이메일 연결 완료</button><button type="button" disabled={busy} onClick={() => { setChallenge(null); setCode(''); setMessage('') }}>이메일 수정·다시 요청</button>
      </>}
    </form>}
    {error && <p role="alert">{error}</p>}{message && <p role="status">{message}</p>}
  </section>
}
export function EmailPasswordRecovery({ onLogin, onRecoveryCode }: { onLogin: () => void; onRecoveryCode: () => void }) {
  const [email, setEmail] = useState(''), [code, setCode] = useState(''), [password, setPassword] = useState(''), [challenge, setChallenge] = useState<Challenge | null>(null)
  const [busy, setBusy] = useState(false), [error, setError] = useState(''), [message, setMessage] = useState(''), [result, setResult] = useState<{ username: string; recovery: string } | null>(null)
  const request = async (event: FormEvent) => {
    event.preventDefault(); setBusy(true); setError(''); setMessage('')
    try { setChallenge(await cloudRequest<Challenge>('/email/reset/request', { email })); setCode(''); setMessage('인증된 계정의 이메일이면 재설정 번호가 발송됩니다. 스팸함도 확인해주세요. 번호는 요청한 이 화면에서 입력하며, 10분 동안 유효합니다.') }
    catch (error) { setError(errorText(error)) } finally { setBusy(false) }
  }
  const complete = async (event: FormEvent) => {
    event.preventDefault()
    if (!validNewPassword(password)) { setError(passwordHint); return }
    if (!challenge) return
    setBusy(true); setError(''); setMessage('')
    try { setResult(await cloudRequest<{ username: string; recovery: string }>('/email/reset/complete', { challenge: challenge.challenge, code, password })); setPassword(''); setCode(''); setChallenge(null) }
    catch (error) { setError(errorText(error)) } finally { setBusy(false) }
  }
  return <div className={styles.form}><h2>이메일로 비밀번호 재설정</h2>
    {result ? <aside className={styles.recovery} role="status"><h3>비밀번호를 변경했어요</h3><p>{result.username} 계정의 모든 기기에서 로그아웃했습니다. 새 비밀번호로 로그인해주세요.</p><p>이전 복구 코드는 더 이상 사용할 수 없습니다. 새 복구 코드를 안전한 곳에 보관하세요.</p><code>{result.recovery}</code><button type="button" onClick={onLogin}>보관했어요 · 로그인하기</button></aside> : <>
      {!challenge ? <form onSubmit={request} className={styles.form}><p>계정에 연결하고 인증한 이메일을 입력해주세요.</p><label>계정 복구 이메일<input type="email" autoComplete="email" required maxLength={254} disabled={busy} value={email} onChange={e => setEmail(e.target.value)} /></label><button disabled={busy} type="submit">재설정 번호 받기</button></form> : <form onSubmit={complete} className={styles.form}>
        <p>{email}로 요청한 인증번호를 입력해주세요. 이메일이 연결되지 않았다면 복구 코드를 사용하세요.</p>
        <label>재설정 인증번호<input required inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{8}" maxLength={8} disabled={busy} value={code} onChange={e => setCode(e.target.value)} /></label>
        <label>새 비밀번호<input type="password" autoComplete="new-password" required minLength={8} maxLength={128} disabled={busy} value={password} onChange={e => setPassword(e.target.value)} /><small>{passwordHint}</small></label>
        <PasswordRules password={password} /><button disabled={busy} type="submit">새 비밀번호로 변경</button><button type="button" disabled={busy} onClick={() => { setChallenge(null); setCode(''); setPassword(''); setMessage('') }}>이메일 수정·다시 요청</button>
      </form>}
      <div className={styles.actions}><button type="button" disabled={busy} onClick={onLogin}>로그인으로 돌아가기</button><button type="button" disabled={busy} onClick={onRecoveryCode}>복구 코드 사용하기</button></div>
    </>}
    {error && <p role="alert">{error}</p>}{message && <p role="status">{message}</p>}
  </div>
}
