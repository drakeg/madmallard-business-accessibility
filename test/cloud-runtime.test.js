import test from 'node:test';
import assert from 'node:assert/strict';
import {Readable} from 'node:stream';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import handler from '../api/index.js';
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
}finally{process.on('exit',()=>rmSync(dir,{recursive:true,force:true}));}
