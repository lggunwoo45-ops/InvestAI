import { normalizeConnection } from './positions.mjs'

export function editableConnection(state, input) {
  const connection = state.connections?.find(c => c.id === input.id)
  if (!connection) throw new Error('연결을 찾을 수 없습니다.')
  if (!Number.isSafeInteger(input.revision) || input.revision !== (connection.revision ?? 0)) {
    throw Object.assign(new Error('다른 화면에서 연결 설정을 변경했습니다. 최신 내용을 확인한 뒤 다시 시도해주세요.'), { status: 409 })
  }
  return connection
}
export function updateConnection(connection, input, channelConfigured, now) {
  const config = normalizeConnection({ ...connection.config, label: input.label, notify: input.notify, thresholds: input.thresholds })
  if (config.venue === 'lighter' && config.thresholds.leverage !== null) throw new Error('Lighter는 레버리지 기준을 지원하지 않습니다.')
  if (config.notify && !channelConfigured) throw new Error('Telegram 연결을 확인한 뒤 외부 알림을 켜주세요.')
  if (JSON.stringify(config.thresholds) !== JSON.stringify(connection.config.thresholds)) connection.risk = {}
  if (!config.notify) for (const event of connection.events) if (event.delivery.status === 'pending') event.delivery.status = 'off'
  connection.config = config
  connection.revision = (connection.revision ?? 0) + 1
  connection.updatedAt = now
}
