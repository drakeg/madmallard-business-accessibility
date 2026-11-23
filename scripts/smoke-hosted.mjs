#!/usr/bin/env node
// Read-only hosted smoke: no logins, writes, credentials, or customer data.
const url=process.env.SMOKE_BASE_URL||'https://madmallard-business-accessibility.vercel.app';
const origin=new URL(url);
if(origin.protocol!=='https:'&&!['localhost','127.0.0.1'].includes(origin.hostname))throw new Error('Use an HTTPS target for a hosted smoke check');
const checks=[
 {path:'/healthz',status:200,validate:body=>body.status==='ok'},
 {path:'/api/auth/status',status:200,validate:body=>typeof body.needsSetup==='boolean'},
 {path:'/api/audits',status:401,validate:body=>body.error==='Sign in required'}
];
let failed=false;
let setupPending=false;
for(const check of checks){
 try{
  const response=await fetch(new URL(check.path,origin),{signal:AbortSignal.timeout(15000),redirect:'error',headers:{Accept:'application/json','Cache-Control':'no-cache'}});
  const type=response.headers.get('content-type')||'';
  if(!type.includes('application/json'))throw new Error('Expected JSON, received '+type.slice(0,70));
  const data=await response.json();
  if(response.status!==check.status||!check.validate(data))throw new Error(`Unexpected API response (HTTP ${response.status})`);
  console.log(`PASS ${check.path}: HTTP ${response.status}`);
  if(check.path==='/api/auth/status'&&data.needsSetup===true)setupPending=true;
 }catch(error){failed=true;console.error(`FAIL ${check.path}: ${String(error.message||error).slice(0,200)}`);}
}
if(setupPending){
 const notice='Administrator setup is pending: open /login, complete the one-time setup, and verify an authorized scan before considering production customer-ready.';
 console.warn('SETUP PENDING: '+notice);
 if(process.env.GITHUB_ACTIONS==='true')console.log('::warning title=Production setup incomplete::'+notice);
}
if(failed)process.exitCode=1;
