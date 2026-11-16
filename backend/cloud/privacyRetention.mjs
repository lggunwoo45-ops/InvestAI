// Only expired authentication material is removed automatically. Member records
// remain available until their owner requests deletion.
export function purgeExpiredAuthentication(db, now = Date.now()) {
  db.exec('BEGIN IMMEDIATE')
  try {
    const counts = {}
    for (const table of ['sessions', 'email_challenges', 'email_limits']) {
      counts[table] = Number(db.prepare(`DELETE FROM ${table} WHERE expires<=?`).run(now).changes)
    }
    // Keep linked chats; pairing codes are temporary, not connection records.
    counts.pairs = Number(db.prepare('UPDATE telegram SET pair=NULL,expires=NULL WHERE expires<=?').run(now).changes)
    db.exec('COMMIT')
    return counts
  } catch (error) { db.exec('ROLLBACK'); throw error }
}

const ownerTables = ['email_challenges', 'email_addresses', 'sessions', 'records', 'telegram', 'prices', 'monitors', 'opportunity_trials']
// Operator-only, offline support procedure. This is deliberately not an HTTP
// endpoint. A dry run is the default; applying requires the exact internal ID.
export function eraseMemberOffline(db, owner, { confirmOwner, now = Date.now() } = {}) {
  if (!/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/.test(owner)) throw new Error('Use the verified internal member ID.')
  db.exec('PRAGMA foreign_keys=ON; PRAGMA secure_delete=ON; BEGIN IMMEDIATE')
  try {
    if (db.prepare('SELECT 1 FROM worker WHERE expires>?').get(now)) throw new Error('Stop the member server and wait for its worker lease to expire first.')
    const user = db.prepare('SELECT id,username FROM users WHERE id=?').get(owner)
    if (!user) throw new Error('Member was not found; no data was changed.')
    const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'").all().map(row => row.name)
    for (const table of tables) {
      if (!/^[a-z_]+$/.test(table)) throw new Error('Unexpected schema; inspect before deleting.')
      if (!ownerTables.includes(table) && db.prepare(`PRAGMA foreign_key_list(${table})`).all().some(fk => fk.table === 'users')) throw new Error('Unrecognized member table; update the deletion procedure first.')
    }
    const counts = {}
    for (const table of ownerTables.filter(table => tables.includes(table))) {
      counts[table] = Number(db.prepare(`SELECT COUNT(*) AS count FROM ${table} WHERE owner=?`).get(owner).count)
    }
    const address = db.prepare('SELECT address FROM email_addresses WHERE owner=?').get(owner)?.address
    counts.email_challenges = Number(db.prepare('SELECT COUNT(*) AS count FROM email_challenges WHERE owner=? OR username=? OR address=?').get(owner,user.username,address ?? '').count)
    if (confirmOwner === undefined) { db.exec('ROLLBACK'); return { applied: false, counts } }
    if (confirmOwner !== owner) throw new Error('Confirmation must match the verified internal member ID.')
    db.prepare('DELETE FROM email_challenges WHERE owner=? OR username=? OR address=?').run(owner, user.username, address ?? '')
    for (const table of ownerTables.filter(table => table !== 'email_challenges' && tables.includes(table))) db.prepare(`DELETE FROM ${table} WHERE owner=?`).run(owner)
    db.prepare('DELETE FROM users WHERE id=?').run(owner)
    db.exec('COMMIT')
    return { applied: true, counts }
  } catch (error) { db.exec('ROLLBACK'); throw error }
}
