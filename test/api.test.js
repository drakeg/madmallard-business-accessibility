import test from 'node:test';
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {once} from 'node:events';
import {Store} from '../src/store.js';
test('API protects records, enforces consent and persists review/export',async()=>{
 const dir=mkdtempSync(tmpdir()+'/audit-api-');const s=new Store(dir+'/db');const a=s.save({state:'complete',url:'https://example.com/',findings:[{id:'label',target:['input'],status:'open',note:''}],manual:{keyboard:'not-tested'}});s.save({state:'failed',url:'https://example.com/second',error:'Synthetic test record'});s.close();
 const token='test-token-'.repeat(5);const port=19000+Math.floor(Math.random()*10000);const child=spawn(process.execPath,['src/server.js'],{env:{...process.env,API_TOKEN:token,ALLOWED_ORIGINS:'https://example.com',DB_PATH:dir+'/db',PORT:String(port),HOST:'127.0.0.1'},stdio:'pipe'});
 const base=`http://127.0.0.1:${port}`;const request=(path,options={})=>fetch(base+path,{...options,headers:{Authorization:`Bearer ${token}`,'Content-Type':'application/json',...options.headers}});
 try{
 let ready=false;for(let i=0;i<80;i++){try{if((await fetch(base+'/healthz')).ok){ready=true;break;}}catch{}await new Promise(r=>setTimeout(r,50));}assert.ok(ready,'server starts');
 assert.equal((await fetch(base+'/api/audits')).status,401);
 const feedback=await fetch(base+'/scan-feedback.js');assert.equal(feedback.status,200);assert.match(await feedback.text(),/observeScanOutcomes/);
 assert.equal((await request('/api/audits',{method:'POST',body:JSON.stringify({url:'https://example.com'})})).status,400);
 assert.equal((await request('/api/audits',{method:'POST',body:JSON.stringify({url:'http://127.0.0.1',permissionConfirmed:true})})).status,400);
 assert.equal((await request(`/api/audits/${a.id}`,{method:'PATCH',body:JSON.stringify({findingIndex:0,status:'fixed',note:''})})).status,400);
 assert.equal((await request(`/api/audits/${a.id}`,{method:'PATCH',body:JSON.stringify({findingIndex:0,status:'fixed',note:'Label applied; keyboard review completed'})})).status,200);
 const exported=await(await request(`/api/audits/${a.id}/export`)).json();assert.equal(exported.findings[0].status,'fixed');assert.match(exported.findings[0].note,/Label applied/);
 assert.equal((await request(`/api/audits/${a.id}`,{method:'DELETE'})).status,200);assert.equal((await request(`/api/audits/${a.id}`)).status,404);
 const cleared=await request('/api/audits',{method:'DELETE'});assert.equal(cleared.status,200);assert.equal((await cleared.json()).deleted,1);
 }finally{child.kill('SIGTERM');await once(child,'exit');rmSync(dir,{recursive:true});}
});
