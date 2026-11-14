import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {Store} from '../src/store.js';
import {publicAddress,parseTarget,validateTarget,compare} from '../src/policy.js';
test('blocks local, metadata, reserved and mapped private addresses',()=>{
 for(const ip of ['127.0.0.1','10.0.0.1','169.254.169.254','192.168.1.2','::1','fc00::1','::ffff:127.0.0.1'])assert.equal(publicAddress(ip),false,ip);
 assert.equal(publicAddress('8.8.8.8'),true);
});
test('exact origins, protocols and credentials are enforced',()=>{
 assert.equal(parseTarget('https://example.com/a',['https://example.com']).pathname,'/a');
 for(const url of ['https://evil.example.com','http://example.com','https://user:pass@example.com','file:///etc/passwd'])assert.throws(()=>parseTarget(url,['https://example.com']));
});
test('mixed public/private DNS fails closed',async()=>{
 await assert.rejects(validateTarget('https://example.com',['https://example.com'],async()=>[{address:'8.8.8.8'},{address:'10.0.0.1'}]));
 await validateTarget('https://example.com',['https://example.com'],async()=>[{address:'8.8.8.8'}]);
});
test('comparison detects removed and introduced findings and rejects different pages',()=>{
 const a={url:'https://example.com',findings:[{id:'a',target:['#one']},{id:'b',target:['#two']}]};
 const b={url:a.url,findings:[a.findings[1],{id:'c',target:['#three']}]};
 const result=compare(a,b);assert.equal(result.resolved.length,1);assert.equal(result.remaining.length,1);assert.equal(result.introduced.length,1);
 assert.throws(()=>compare(a,{...b,url:'https://elsewhere.com'}));
});
test('audit records and review evidence survive reopening',()=>{
 const dir=mkdtempSync(tmpdir()+'/audit-');let store=new Store(dir+'/db');const saved=store.save({state:'complete',findings:[{status:'fixed',note:'Verified label'}]});store.close();store=new Store(dir+'/db');assert.deepEqual(store.get(saved.id),saved);assert.equal(store.list().length,1);store.close();rmSync(dir,{recursive:true});
});

test('unrestricted domains remain public-only unless local testing is explicit',async()=>{
 assert.equal(parseTarget('https://another.example/',[]).hostname,'another.example');
 assert.throws(()=>parseTarget('http://host.docker.internal:8016/',[]));
 const options={localTesting:true};
 await validateTarget('http://host.docker.internal:8016/',[],async()=>[{address:'192.168.65.254'}],options);
 await assert.rejects(validateTarget('http://host.docker.internal/',[],async()=>[{address:'192.168.65.254'}]));
 await assert.rejects(validateTarget('http://169.254.169.254/',[],undefined,options));
 await assert.rejects(validateTarget('http://[fd00:ec2::254]/',[],undefined,options));
});
