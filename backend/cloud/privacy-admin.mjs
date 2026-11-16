import { DatabaseSync } from 'node:sqlite'
import { existsSync, realpathSync, statSync } from 'node:fs'
import { join, isAbsolute, relative } from 'node:path'
import { eraseMemberOffline } from './privacyRetention.mjs'

// Run only after a verified rights request and a clean server shutdown.
const args=process.argv.slice(2), [directory,owner,flag,confirmation]=args
if (!directory || !/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/.test(owner ?? '') || !isAbsolute(directory) || ![2,4].includes(args.length) || args.length===4 && flag!=='--confirm-owner') {
  console.error('Usage: node cloud/privacy-admin.mjs ABSOLUTE_CLOUD_DIRECTORY MEMBER_ID [--confirm-owner MEMBER_ID]')
  process.exitCode=1
} else {
  let db
  try {
    const root=realpathSync(directory), file=join(root,'accounts.sqlite')
    if (relative(root,realpathSync(file))!=='accounts.sqlite') throw new Error('Database must be directly inside the approved cloud directory.')
    if (!statSync(file).isFile()) throw new Error('Existing accounts database required.')
    // Current cloud monitors are stored in SQLite. Do not silently leave older
    // filesystem stores behind if this deployment has legacy member files.
    if (existsSync(join(root,'members',owner))) throw new Error('Legacy member files exist; inspect and include them in the deletion scope first.')
    db=new DatabaseSync(file)
    const result=eraseMemberOffline(db,owner,{confirmOwner:confirmation})
    if(result.applied){const checkpoint=db.prepare('PRAGMA wal_checkpoint(TRUNCATE)').get();if(checkpoint.busy)throw new Error('Database rows deleted; close other readers and checkpoint the WAL before confirming completion.');db.exec('VACUUM')}
    console.log(JSON.stringify(result))
  } catch(error){console.error(error.message);process.exitCode=1} finally{db?.close()}
}
