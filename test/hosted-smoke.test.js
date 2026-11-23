import test from 'node:test';
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {once} from 'node:events';
import http from 'node:http';

async function verify({needsSetup,unauthorizedStatus=401}){
 const server=http.createServer((req,res)=>{
  const code=req.url==='/api/audits'?unauthorizedStatus:200;
  const data=req.url==='/healthz'?{status:'ok'}:req.url==='/api/auth/status'?{needsSetup,setupAvailable:true}:req.url==='/api/audits'?{error:code===401?'Sign in required':'Unexpected access'}:{error:'Not found'};
  res.writeHead(code,{'Content-Type':'application/json'});res.end(JSON.stringify(data));
 });
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 try{
  const child=spawn(process.execPath,['scripts/smoke-hosted.mjs'],{env:{...process.env,SMOKE_BASE_URL:`http://127.0.0.1:${server.address().port}`,GITHUB_ACTIONS:'true'},stdio:['ignore','pipe','pipe']});
  let stdout='',stderr='';child.stdout.on('data',chunk=>stdout+=chunk);child.stderr.on('data',chunk=>stderr+=chunk);
  const [exitCode]=await once(child,'exit');
  return {exitCode,stdout,stderr};
 }finally{await new Promise(resolve=>server.close(resolve));}
}

test('hosted smoke warns when production first-admin setup is pending',async()=>{
 const result=await verify({needsSetup:true});
 assert.equal(result.exitCode,0);assert.match(result.stdout,/warning title=Production setup incomplete/);
 assert.match(result.stderr,/SETUP PENDING/);assert.match(result.stdout,/PASS \/api\/audits: HTTP 401/);
});
test('hosted smoke shows no setup warning after an admin exists',async()=>{
 const result=await verify({needsSetup:false});
 assert.equal(result.exitCode,0);assert.doesNotMatch(result.stdout+result.stderr,/SETUP PENDING|Production setup incomplete/);
});
test('hosted smoke still fails when anonymous audit access is unexpectedly permitted',async()=>{
 const result=await verify({needsSetup:false,unauthorizedStatus:200});
 assert.equal(result.exitCode,1);assert.match(result.stderr,/FAIL \/api\/audits/);
});
