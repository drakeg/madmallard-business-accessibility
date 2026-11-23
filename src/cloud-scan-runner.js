import {execute} from './cloud-db.js';
import {finishScan,setScanProgress} from './cloud-scan-lifecycle.js';

/** Run one previously accepted/leased scan. The scanner is injected solely so
 * the real persistence and failure-handling path can be verified with a
 * deterministic, owner-authorized fixture and without creating real accounts. */
export async function runCloudScan(db,a,origins,scan,{logger=console}={}){
 try{
  const result=await scan(a.url,origins,{
   localTesting:false,includeLighthouse:false,
   onProgress:stage=>{setScanProgress(db,a.id,stage).catch(error=>logger.error('Scan progress update failed:',String(error.message||error).slice(0,200)));}
  });
  if(!await finishScan(db,{...result,id:a.id,ownerId:a.ownerId,includeLighthouse:false,stage:'Complete',state:'complete'}))logger.warn('Discarded late scan completion:',a.id);
 }catch(error){
  logger.error('Audit failed:',a.id,String(error.message||error).slice(0,240));
  if(!await finishScan(db,{...a,state:'failed',stage:'Failed',error:String(error.message||error).slice(0,600)}))logger.warn('Discarded late scan failure:',a.id);
 }finally{
  await execute(db,'DELETE FROM scan_lease WHERE id=1 AND audit_id=?',[a.id]);
 }
}
