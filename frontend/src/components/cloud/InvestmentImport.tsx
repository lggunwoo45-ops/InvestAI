import { useState } from 'react'
import { confirmInvestmentImport, previewGuestInvestments, type ImportSelection, type InvestmentImportPreview } from '@/services/cloud/investmentImport'
import styles from './MemberAccount.module.css'

export function InvestmentImport(){
  const [selection,setSelection]=useState<ImportSelection>({portfolio:true,watchlists:true,scenarios:true})
  const [preview,setPreview]=useState<InvestmentImportPreview|null>(null),[error,setError]=useState(''),[message,setMessage]=useState(''),[busy,setBusy]=useState(false)
  const labels={portfolio:'보유·거래 기록과 목표/손절 기준',watchlists:'관심목록·종목 메모·검토 이력',scenarios:'가격 시나리오·화면 감시 기록'}
  return <details className={styles.confirm}><summary>기존 내 투자·관심종목 가져오기</summary>
    <p>선택한 브라우저 자료를 현재 계정의 서버 저장소로 복사합니다. 원본은 보존하며, 같은 항목의 내용이 다르면 덮어쓰지 않고 중지합니다.</p>
    {(Object.keys(labels) as (keyof ImportSelection)[]).map(key=><label key={key}><input type="checkbox" checked={selection[key]} disabled={busy} onChange={e=>{setSelection({...selection,[key]:e.target.checked});setPreview(null);setError('');setMessage('')}}/>{labels[key]}</label>)}
    <p>가격 시나리오는 해당 기기의 화면이 보일 때 확인합니다. 서버의 상시 감시는 별도로 등록해야 합니다.</p>
    <button disabled={busy||!Object.values(selection).some(Boolean)} onClick={()=>{setError('');setMessage('');try{setPreview(previewGuestInvestments(selection))}catch(e){setPreview(null);setError(e instanceof Error?e.message:'가져올 자료를 확인하지 못했습니다.')}}}>가져올 내용 미리보기</button>
    {preview&&<section aria-label="투자 기록 가져오기 미리보기"><ul>{preview.summary.map(text=><li key={text}>{text}</li>)}</ul>{!preview.rows.length?<p>추가할 자료가 없습니다.</p>:<button disabled={busy} onClick={()=>{setBusy(true);setError('');void confirmInvestmentImport(preview).then(()=>{setPreview(null);setMessage('계정에 복사하고 동기화했습니다. 브라우저 원본은 그대로 남아 있습니다.')}).catch(e=>setError(e instanceof Error?e.message:'동기화 상태를 확인해주세요.')).finally(()=>setBusy(false))}}>확인한 자료를 이 계정으로 복사</button>}</section>}
    {error&&<p role="alert">{error}</p>}{message&&<p role="status">{message}</p>}
  </details>
}
