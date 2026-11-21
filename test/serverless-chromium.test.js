import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import {scan} from '../src/scanner.js';

// Linux CI exercises the actual bundled serverless Chromium binary used by
// Vercel. The app still needs a separate authenticated deployment smoke check.
test('packaged serverless Chromium runs the authorized axe + SEO workflow',{
 skip:process.platform!=='linux'?'Packaged serverless Chromium is Linux-only':false,
 timeout:110_000
},async()=>{
 const server=http.createServer((_req,res)=>{
  res.writeHead(200,{'Content-Type':'text/html; charset=utf-8'});
  res.end('<!doctype html><html lang="en"><head><title>Approved local test page</title><meta name="description" content="An intentionally deficient page used only for scanner verification"></head><body><main><h1>Demo</h1><input id="contact" type="text"></main></body></html>');
 });
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 const old=process.env.VERCEL;
 try{
  process.env.VERCEL='1';
  const url=`http://127.0.0.1:${server.address().port}/`;
  const result=await scan(url,[],{localTesting:true,includeLighthouse:false});
  assert.equal(result.url,url);
  assert.equal(result.seo.title,'Approved local test page');
  assert.ok(result.findings.some(f=>f.id==='label'),'Expected missing accessible label finding');
  assert.equal(result.lighthouse.state,'not-requested');
  assert.equal(result.seo.htmlValidation?.state,'complete');
 }finally{
  if(old===undefined)delete process.env.VERCEL;else process.env.VERCEL=old;
  await new Promise(resolve=>server.close(resolve));
 }
});
