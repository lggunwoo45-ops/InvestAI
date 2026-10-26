export const passwordHint = '8~128자, 영문 대문자·숫자·특수문자를 각각 1개 이상 포함해주세요.'
export function passwordChecks(value) {
  const text = typeof value === 'string' ? value : ''
  return { length: text.length >= 8 && text.length <= 128, uppercase: /[A-Z]/.test(text), number: /[0-9]/.test(text), special: /[!-/:-@\[-`{-~]/.test(text) }
}
export const validNewPassword = value => typeof value === 'string' && Object.values(passwordChecks(value)).every(Boolean)
