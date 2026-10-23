import { useState } from 'react'
import { lockCredentialVault, removeCredentialVault, setupCredentialVault, unlockCredentialVault, type MonitorState, type VaultStatus } from '@/services/research/monitorClient'
import styles from './PositionConnections.module.css'

export function CredentialVaultPanel({ vault, disabled, act }: { vault?: VaultStatus; disabled: boolean; act: (work: () => Promise<MonitorState>, success: string) => Promise<void> }) {
  const [password, setPassword] = useState(''), [repeat, setRepeat] = useState(''), [error, setError] = useState(''), [removing, setRemoving] = useState(false)
  const configured = !!vault?.configured, unlocked = !!vault?.unlocked
  const open = async () => {
    if (password.length < 12 || password.length > 256) { setError('이 앱에서 사용할 비밀번호를 12자 이상 입력해주세요.'); return }
    if (!configured && password !== repeat) { setError('입력한 비밀번호가 서로 다릅니다.'); return }
    setError('')
    try { await act(() => configured ? unlockCredentialVault(password) : setupCredentialVault(password), '보관함을 열었어요. API 연결을 확인할 수 있습니다.') }
    finally { setPassword(''); setRepeat('') }
  }
  return <div className={styles.vault} aria-label="API 키 보관함" onKeyDown={e => { if (e.key === 'Enter' && e.target instanceof HTMLInputElement) { e.preventDefault(); if (!disabled && !unlocked && !removing) void open() } }}>
    <div className={styles.vaultHeader}><div><span className={styles.eyebrow}>이 PC의 키 보관함</span><h4>{unlocked ? '보관함이 열려 있어요' : configured ? '보관함을 열어주세요' : '키를 보관할 공간부터 만들어요'}</h4></div><span className={unlocked ? styles.status : styles.paused}>{unlocked ? '열림' : configured ? '잠김' : '설정 전'}</span></div>
    <p>{unlocked ? '프로그램 실행 중 계정을 조회합니다. 잠그면 API 계정 감시가 멈추고, 공개 계정 감시는 계속됩니다.' : configured ? '프로그램을 다시 시작하면 자동으로 잠깁니다. 아래 비밀번호로 열면 저장한 API 계정 조회가 재개됩니다.' : 'API 키는 이 PC에 암호화해 저장합니다. 거래소 로그인 비밀번호와 다른 보관함 전용 비밀번호를 정해주세요.'}</p>
    {!unlocked && <div className={styles.vaultInputs}><label>보관함 비밀번호<input type="password" autoComplete="off" minLength={12} maxLength={256} value={password} disabled={disabled} onChange={e => setPassword(e.target.value)} /></label>{!configured && <label>보관함 비밀번호 확인<input type="password" autoComplete="off" maxLength={256} value={repeat} disabled={disabled} onChange={e => setRepeat(e.target.value)} /></label>}<button type="button" disabled={disabled || password.length < 12} onClick={() => void open()}>{configured ? '보관함 열기' : '암호화 보관함 만들기'}</button>{!configured && <small>비밀번호를 잊으면 키를 복구할 수 없어 보관함을 삭제하고 다시 연결해야 합니다.</small>}</div>}
    {error && <p role="alert">{error}</p>}
    {configured && <div className={styles.vaultActions}>{unlocked && <button type="button" disabled={disabled} onClick={() => void act(lockCredentialVault, '보관함을 잠갔어요. 비공개 포지션 감시를 보류합니다.')}>보관함 잠그기</button>}<button type="button" disabled={disabled} onClick={() => setRemoving(!removing)}>{removing ? '삭제 취소' : '보관함 삭제'}</button></div>}
    {removing && <div className={styles.deleteConfirm}><p>암호화된 키와 Binance·Bybit 연결·포지션 기록을 이 PC에서 삭제합니다. 연결된 신호 감시는 종료되며, 공개 계정과 기존 신호 결과는 남습니다. 거래소에서 발급한 키 자체는 거래소에서 폐기해야 합니다.</p><button type="button" disabled={disabled} onClick={async () => { await act(removeCredentialVault, '보관함과 API 연결을 삭제했어요.'); setRemoving(false) }}>보관함과 API 연결 모두 삭제</button></div>}
  </div>
}
