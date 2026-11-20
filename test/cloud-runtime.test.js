import test from 'node:test';
import assert from 'node:assert/strict';
import {Readable} from 'node:stream';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import handler from '../api/index.js';
import {database,execute,one} from '../src/cloud-db.js';
import {SCAN_LEASE_MS,recoverInterruptedScans,setScanProgress} from '../src/cloud-scan-lifecycle.js';
const dir=mkdtempSync(join(tmpdir(),'mm-vercel-test-'));
process.env.LIBSQL_URL='file:'+join(dir,'test.sqlite');
process.env.ADMIN_SETUP_TOKEN='a'.repeat(64);
const request=async(path,{method='GET',json,headers={}}={})=>{
 const req=Readable.from(json===undefined?[]:[Buffer.from(JSON.stringify(json))]);req.url=path;req.method=method;req.headers={host:'test.example',...headers};req.socket={remoteAddress:'127.0.0.1'};
 const res={status:200,headers:{},setHeader(k,v){this.headers[k.toLowerCase()]=v},writeHead(status,headers={}){this.status=status;for(const [k,v] of Object.entries(headers))this.setHeader(k,v)},end(body){this.body=String(body||'')}};
 await handler(req,res);return {status:res.status,headers:res.headers,body:res.body,json:()=>JSON.parse(res.body)};
};
try{
 test('homepage survives unconfigured storage and API returns explicit 503 without API_TOKEN',async()=>{
  const saved=process.env.LIBSQL_URL;delete process.env.LIBSQL_URL;
  try{
   const homepage=await request('/?__path=');assert.equal(homepage.status,200);assert.match(homepage.body,/Audit, understand, and improve/);
   const health=await request('/healthz?__path=healthz');assert.equal(health.status,503);assert.equal(health.json().status,'database-unconfigured');
   const status=await request('/api/auth/status?__path=api/auth/status');assert.equal(status.status,503);assert.match(status.json().error,/Database not configured/);
  }finally{process.env.LIBSQL_URL=saved;}
  const status=await request('/api/auth/status?__path=api/auth/status');assert.deepEqual(status.json(),{needsSetup:true,setupAvailable:true});
 });
 test('administrator bootstrap requires separate one-time secret but website login does not require API_TOKEN',async()=>{
  const base={username:'owner',password:'a very long password 123',name:'Owner'};
  const wrong=await request('/api/auth/setup?__path=api/auth/setup',{method:'POST',json:{...base,bootstrapToken:'wrong'}});assert.equal(wrong.status,401);
  const setup=await request('/api/auth/setup?__path=api/auth/setup',{method:'POST',json:{...base,bootstrapToken:process.env.ADMIN_SETUP_TOKEN}});
  assert.equal(setup.status,200,setup.body);assert.equal(setup.json().user.role,'admin');
  assert.ok(setup.headers['set-cookie'].includes('HttpOnly'));assert.ok(setup.headers['set-cookie'].includes('Secure'));
  const cookie=setup.headers['set-cookie'].split(';')[0],csrf=setup.json().csrf;
  assert.equal((await request('/api/me?__path=api/me',{headers:{cookie}})).json().user.username,'owner');
  assert.equal((await request('/api/audits?__path=api/audits',{headers:{cookie}})).json().audits.length,0);
  const withoutCsrf=await request('/api/profile?__path=api/profile',{method:'PATCH',json:{name:'Changed'},headers:{cookie}});assert.equal(withoutCsrf.status,403);
  const update=await request('/api/profile?__path=api/profile',{method:'PATCH',json:{name:'Changed'},headers:{cookie,'x-csrf-token':csrf}});assert.equal(update.status,200);
  const login=await request('/api/auth/login?__path=api/auth/login',{method:'POST',json:{username:base.username,password:base.password}});assert.equal(login.status,200,login.body);assert.equal(login.json().user.hasToken,false);
  const noSecondSetup=await request('/api/auth/setup?__path=api/auth/setup',{method:'POST',json:{...base,username:'attacker',bootstrapToken:process.env.ADMIN_SETUP_TOKEN}});assert.equal(noSecondSetup.status,409);
 });
 test('cloud backend requires permission and blocks local URL targets',async()=>{
  const login=await request('/api/auth/login?__path=api/auth/login',{method:'POST',json:{username:'owner',password:'a very long password 123'}});const cookie=login.headers['set-cookie'].split(';')[0],csrf=login.json().csrf;
  const body={url:'http://127.0.0.1/',permissionConfirmed:true,includeLighthouse:false};
  const invalid=await request('/api/audits?__path=api/audits',{method:'POST',json:body,headers:{cookie,'x-csrf-token':csrf}});assert.ok([400,403].includes(invalid.status),invalid.body);
  const noPermission=await request('/api/audits?__path=api/audits',{method:'POST',json:{...body,permissionConfirmed:false},headers:{cookie,'x-csrf-token':csrf}});assert.equal(noPermission.status,400);
 });
 test('durable scan lease recovers interruptions without touching completed or active audits',async()=>{
  const db=await database(),now=Date.now();
  const owner=await one(db,'SELECT id FROM users WHERE username=?',['owner']);
  const seed=(id,state,stage='Accessibility and on-page SEO')=>({id,url:'https://example.org/',ownerId:owner.id,createdAt:new Date(now-10000).toISOString(),state,stage,findings:[]});
  for(const audit of [seed('stale-01','running'),seed('active-02','running'),seed('done-003','complete')]){
   await execute(db,'INSERT INTO audits(id,body) VALUES (?,?)',[audit.id,JSON.stringify(audit)]);
  }
  await execute(db,'INSERT INTO scan_lease(id,audit_id,expires) VALUES (1,?,?)',['active-02',now+SCAN_LEASE_MS]);
  assert.equal(await recoverInterruptedScans(db,now),1);
  const stale=JSON.parse((await one(db,'SELECT body FROM audits WHERE id=?',['stale-01'])).body);
  assert.equal(stale.state,'failed');assert.match(stale.error,/interrupted/);
  assert.equal(await setScanProgress(db,'stale-01','Scanning'),false);
  assert.equal(await setScanProgress(db,'done-003','Scanning'),false);
  assert.equal(await setScanProgress(db,'active-02','Checking SEO'),true);
  assert.equal(await recoverInterruptedScans(db,now+SCAN_LEASE_MS+1),1);
  const active=JSON.parse((await one(db,'SELECT body FROM audits WHERE id=?',['active-02'])).body);
  assert.equal(active.state,'failed');assert.equal(active.stage,'Interrupted');
  assert.equal(await one(db,'SELECT audit_id FROM scan_lease WHERE id=1'),null);
  const done=JSON.parse((await one(db,'SELECT body FROM audits WHERE id=?',['done-003'])).body);
  assert.equal(done.state,'complete');assert.equal(done.stage,'Accessibility and on-page SEO');
  const login=await request('/api/auth/login?__path=api/auth/login',{method:'POST',json:{username:'owner',password:'a very long password 123'}});
  const list=await request('/api/audits?__path=api/audits',{headers:{cookie:login.headers['set-cookie'].split(';')[0]}});
  assert.equal(list.status,200);
  assert.equal(list.json().audits.find(a=>a.id==='stale-01').state,'failed');
  assert.equal(list.json().audits.find(a=>a.id==='done-003').state,'complete');
 });
 test('cloud HTML report persists across requests and rejects anonymous access',async()=>{
  const db=await database();
  const owner=await one(db,'SELECT id FROM users WHERE username=?',['owner']);
  const audit={id:'aabbccdd-0011-4a22-aa33-445566778899',url:'https://example.org/',ownerId:owner.id,createdAt:new Date().toISOString(),state:'complete',findings:[],incomplete:[],manual:{keyboard:'not-tested'},lighthouse:{state:'not-requested'}};
  await execute(db,'INSERT INTO audits(id,body) VALUES(?,?)',[audit.id,JSON.stringify(audit)]);
  const login=await request('/api/auth/login?__path=api/auth/login',{method:'POST',json:{username:'owner',password:'a very long password 123'}});
  assert.equal(login.status,200);
  const reportPath='/api/audits/aabbccdd-0011-4a22-aa33-445566778899/report.html?__path=api/audits/aabbccdd-0011-4a22-aa33-445566778899/report.html';
  const denied=await request(reportPath);assert.equal(denied.status,401);
  const cookie=login.headers['set-cookie'].split(';')[0];
  for(let n=0;n<2;n++){
   const report=await request(reportPath,{headers:{cookie}});
   assert.equal(report.status,200);
   assert.match(report.body,/Accessibility, SEO & Lighthouse report/);
   assert.match(report.headers['content-disposition'],/attachment/);
   const detail=await request('/api/audits/aabbccdd-0011-4a22-aa33-445566778899?__path=api/audits/aabbccdd-0011-4a22-aa33-445566778899',{headers:{cookie}});
   assert.equal(detail.status,200);
   assert.equal(detail.json().state,'complete');
  }
 });
 test('customer portal isolates reports and comparison and prevents writes',async()=>{
  const db=await database();
  const adminLogin=await request('/api/auth/login?__path=api/auth/login',{method:'POST',json:{username:'owner',password:'a very long password 123'}});
  assert.equal(adminLogin.status,200);
  const adminCookie=adminLogin.headers['set-cookie'].split(';')[0];
  const csrf=adminLogin.json().csrf;
  const createCustomer=async username=>request('/api/customers?__path=api/customers',{method:'POST',headers:{cookie:adminCookie,'x-csrf-token':csrf},json:{name:username,username,password:'safe sample password 1234'}});
  const alice=await createCustomer('agency_alice');const bob=await createCustomer('agency_bob');
  assert.equal(alice.status,201,alice.body);assert.equal(bob.status,201,bob.body);
  const sample=(id,ownerId)=>({id,url:'https://example.org/',ownerId,createdAt:new Date().toISOString(),state:'complete',findings:[],incomplete:[],manual:{keyboard:'not-tested'},lighthouse:{state:'not-requested'}});
  const a=sample('aaaa0000-1111-4111-8111-111111111111',alice.json().user.id);
  const b=sample('bbbb0000-2222-4222-8222-222222222222',bob.json().user.id);
  for(const item of [a,b])await execute(db,'INSERT INTO audits(id,body) VALUES (?,?)',[item.id,JSON.stringify(item)]);
  const login=await request('/api/auth/login?__path=api/auth/login',{method:'POST',json:{username:'agency_alice',password:'safe sample password 1234'}});
  assert.equal(login.status,200,login.body);
  const cookie=login.headers['set-cookie'].split(';')[0];
  const headers={cookie,'x-csrf-token':login.json().csrf};
  const list=await request('/api/audits?__path=api/audits',{headers});
  assert.equal(list.status,200);
  assert.ok(list.json().audits.some(x=>x.id===a.id));
  assert.ok(!list.json().audits.some(x=>x.id===b.id));
  const path=id=>'/api/audits/'+id+'?__path=api/audits/'+id;
  assert.equal((await request(path(a.id),{headers})).status,200);
  assert.equal((await request(path(b.id),{headers})).status,404);
  for(const id of [a.id,b.id]){
   const report=await request('/api/audits/'+id+'/report.html?__path=api/audits/'+id+'/report.html',{headers});
   assert.equal(report.status,id===a.id?200:404);
  }
  for(const id of [b.id]){
   const raw=await request('/api/audits/'+id+'/export?__path=api/audits/'+id+'/export',{headers});
   assert.equal(raw.status,404);
  }
  const compare=await request('/api/compare?__path=api/compare&before='+a.id+'&after='+b.id,{headers});
  assert.notEqual(compare.status,200);
  const onlyOwned=await request('/api/compare?__path=api/compare&before='+a.id+'&after='+a.id,{headers});
  assert.equal(onlyOwned.status,200,onlyOwned.body);
  const deniedDelete=await request(path(a.id),{method:'DELETE',headers});
  assert.equal(deniedDelete.status,403);
  const deniedPatch=await request(path(a.id),{method:'PATCH',headers,json:{ownerId:b.ownerId}});
  assert.equal(deniedPatch.status,403);
  const deniedScan=await request('/api/audits?__path=api/audits',{method:'POST',headers,json:{url:'https://example.org/',permissionConfirmed:true}});
  assert.equal(deniedScan.status,403);
  const deniedCustomers=await request('/api/customers?__path=api/customers',{headers});
  assert.equal(deniedCustomers.status,403);
  assert.equal((await one(db,'SELECT body FROM audits WHERE id=?',[a.id])).body.includes(b.ownerId),false);
 });
}finally{process.on('exit',()=>rmSync(dir,{recursive:true,force:true}));}
