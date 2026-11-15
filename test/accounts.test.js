import test from 'node:test';
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {once} from 'node:events';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {Store} from '../src/store.js';
test('accounts isolate customer scans, enforce CSRF, rotate tokens and revoke sessions',async()=>{
 const dir=mkdtempSync(tmpdir()+'/account-test-');let db=new Store(dir+'/db');const old=db.save({url:'https://fixture.example/',state:'complete',findings:[],manual:{}});db.close();
 const bootstrap='bootstrap-secret-'.repeat(4),password='A-long-test-password-123';const port=41000+Math.floor(Math.random()*10000),base=`http://127.0.0.1:${port}`;
 const child=spawn(process.execPath,['src/server.js'],{env:{...process.env,COOKIE_SECURE:'false',ALLOWED_ORIGINS:'https://fixture.example',LOCAL_TESTING:'true',API_TOKEN:bootstrap,DB_PATH:dir+'/db',PORT:String(port),HOST:'127.0.0.1'},stdio:'pipe'});
 const request=(path,who,method='GET',data,extra={})=>fetch(base+path,{method,headers:{'Content-Type':'application/json',...(who?{Cookie:who.cookie,'X-CSRF-Token':who.csrf}:{}),...extra},...(data?{body:JSON.stringify(data)}:{})});
 async function sign(path,data){const r=await request(path,null,'POST',data);assert.equal(r.status,200,await r.clone().text());const value=await r.json();return {...value,cookie:r.headers.get('set-cookie').split(';')[0],cookieHeader:r.headers.get('set-cookie')};}
 try{
 for(let i=0;i<80;i++){try{if((await fetch(base+'/healthz')).ok)break;}catch{}await new Promise(r=>setTimeout(r,50));}
 assert.equal((await request('/api/audits')).status,401);
 const admin=await sign('/api/auth/setup',{username:'admin',name:'Administrator',password,bootstrapToken:bootstrap});assert.match(admin.cookieHeader,/HttpOnly/);assert.match(admin.cookieHeader,/SameSite=Strict/);
 assert.equal((await request('/api/auth/setup',null,'POST',{username:'another-admin',password,bootstrapToken:bootstrap})).status,409);
 assert.equal((await request('/api/auth/login',null,'POST',{username:'admin',password:'wrong-password'})).status,401);
 assert.equal((await request('/api/audits',null,'GET',null,{Authorization:'Bearer '+bootstrap})).status,401,'bootstrap bearer is retired after setup');
 const create=async username=>{const r=await request('/api/customers',admin,'POST',{username,password,name:username});assert.equal(r.status,201);return (await r.json()).user;};
 const one=await create('customer1'),two=await create('customer2');
 assert.equal((await request('/api/audits/'+old.id,admin,'PATCH',{ownerId:one.id})).status,200);
 db=new Store(dir+'/db');const other=db.save({url:old.url,state:'complete',ownerId:two.id,findings:[],manual:{}});const privateAudit=db.save({url:old.url,state:'complete',ownerId:admin.user.id,findings:[],manual:{}});db.close();
 const customer=await sign('/api/auth/login',{username:'customer1',password}),second=await sign('/api/auth/login',{username:'customer2',password});
 const list=await(await request('/api/audits',customer)).json();assert.deepEqual(list.audits.map(a=>a.id),[old.id]);assert.deepEqual(list.allowedOrigins,[]);assert.equal(list.localTesting,false);assert.equal((await(await request('/api/audits',second)).json()).audits[0].id,other.id);
 for(const id of [other.id,privateAudit.id])for(const suffix of ['', '/export', '/report.html', '/lighthouse.html'])assert.equal((await request('/api/audits/'+id+suffix,customer)).status,404);
 for(const [path,method,data]of [['/api/audits/'+old.id,'DELETE'],['/api/audits/'+old.id,'PATCH',{ownerId:two.id}],['/api/audits','DELETE'],['/api/audits','POST',{url:old.url,permissionConfirmed:true}],['/api/customers','POST',{username:'escalate',password,role:'admin'}]])assert.equal((await request(path,customer,method,data)).status,403);
 assert.equal((await request('/api/customers',customer)).status,403);
 assert.equal((await request('/api/audits/'+old.id+'/report.html',customer)).status,200);
 assert.equal((await request('/api/audits/'+old.id+'/lighthouse.html',customer)).status,404);
 assert.equal((await request(`/api/compare?before=${old.id}&after=${other.id}`,customer)).status,400);
 assert.equal((await request('/api/profile',customer,'PATCH',{name:'Changed'},{'X-CSRF-Token':''})).status,403);
 assert.equal((await request('/api/profile',customer,'PATCH',{name:'Changed'},{Origin:'https://evil.example'})).status,403);
 assert.equal((await request('/api/profile',customer,'PATCH',{name:'Customer One'})).status,200);
 assert.equal((await request('/api/profile/token',customer,'POST',{generate:true,password:'wrong'})).status,401);
 const rotate=async()=>{const r=await request('/api/profile/token',customer,'POST',{generate:true,password});assert.equal(r.status,200);return (await r.json()).token;};
 const custom='custom-integration-token-'.repeat(3);assert.equal((await request('/api/profile/token',customer,'POST',{token:custom,password})).status,200);assert.equal((await request('/api/audits',null,'GET',null,{Authorization:'Bearer '+custom})).status,200);
 const first=await rotate();assert.equal((await request('/api/audits',null,'GET',null,{Authorization:'Bearer '+custom})).status,401);assert.equal((await request('/api/audits',null,'GET',null,{Authorization:'Bearer '+first})).status,200);const latest=await rotate();assert.notEqual(first,latest);assert.equal((await request('/api/audits',null,'GET',null,{Authorization:'Bearer '+first})).status,401);
 const tokenList=await(await request('/api/audits',null,'GET',null,{Authorization:'Bearer '+latest})).json();assert.deepEqual(tokenList.audits.map(a=>a.id),[old.id]);
 db=new Store(dir+'/db');const user=db.db.prepare('SELECT * FROM users WHERE id=?').get(one.id);assert.ok(!user.password.includes(password));assert.notEqual(user.token_hash,latest);db.db.prepare('UPDATE sessions SET expires=1 WHERE user_id=?').run(two.id);db.close();assert.equal((await request('/api/me',second)).status,401);
 assert.equal((await request('/api/auth/logout',customer,'POST')).status,200);assert.equal((await request('/api/me',customer)).status,401);
 assert.equal((await request('/api/profile/password',admin,'POST',{currentPassword:password,password:'Another-long-password-456'})).status,200);assert.equal((await request('/api/me',admin)).status,401);await sign('/api/auth/login',{username:'admin',password:'Another-long-password-456'});
 }finally{child.kill('SIGTERM');await once(child,'exit');rmSync(dir,{recursive:true});}
});
