import {all,one,execute} from './cloud-db.js';

// Vercel can stop a function mid-scan. There is no in-memory busy flag across
// invocations, so recover a stale job using the durable lease, not process state.
export const SCAN_LEASE_MS=150_000;

export async function recoverInterruptedScans(db,now=Date.now()){
 const lease=await one(db,'SELECT audit_id,expires FROM scan_lease WHERE id=1');
 if(lease&&Number(lease.expires)<=now)await execute(db,'DELETE FROM scan_lease WHERE id=1 AND audit_id=? AND expires<=?',[lease.audit_id,now]);
 const running=await all(db,"SELECT body FROM audits WHERE json_extract(body,'$.state')='running'");
 let recovered=0;
 for(const row of running){
  const audit=JSON.parse(row.body);
  // A legitimately active scan should never be marked failed.
  if(lease&&lease.audit_id===audit.id&&Number(lease.expires)>now)continue;
  // This conditional update avoids overwriting a scan that just completed.
  const replacement={...audit,state:'failed',stage:'Interrupted',error:'The scan was interrupted or exceeded the hosting time limit. Start a new audit to retry.',finishedAt:new Date(now).toISOString()};
  const result=await execute(db,"UPDATE audits SET body=? WHERE id=? AND json_extract(body,'$.state')='running'",[JSON.stringify(replacement),audit.id]);
  recovered+=Number(result.rowsAffected)>0?1:0;
 }
 return recovered;
}

export async function setScanProgress(db,id,stage){
 const row=await one(db,'SELECT body FROM audits WHERE id=?',[id]);if(!row)return false;
 const current=JSON.parse(row.body);if(current.state!=='running')return false;
 const result=await execute(db,"UPDATE audits SET body=? WHERE id=? AND json_extract(body,'$.state')='running'",[JSON.stringify({...current,stage}),id]);
 return Number(result.rowsAffected)>0;
}
