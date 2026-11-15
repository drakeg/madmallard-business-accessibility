import {fork} from 'node:child_process';import {mkdtempSync,rmSync} from 'node:fs';import {tmpdir} from 'node:os';
export function runLighthouse(url,origins,options={}){return new Promise(resolve=>{const dir=mkdtempSync(tmpdir()+'/mm-lighthouse-');let settled=false;const child=fork(new URL('./lighthouse-worker.js',import.meta.url),[],{detached:true,stdio:['ignore','ignore','ignore','ipc'],execArgv:['--max-old-space-size=512']});
 const cleanup=()=>{try{rmSync(dir,{recursive:true,force:true});}catch{}};
 const finish=result=>{if(settled)return;settled=true;clearTimeout(timer);resolve(result);};
 const timer=setTimeout(()=>{try{process.kill(-child.pid,'SIGTERM');}catch{}finish({state:'failed',error:'Lighthouse exceeded its 120-second limit; the accessibility/SEO results are retained.'});const kill=setTimeout(()=>{try{process.kill(-child.pid,'SIGKILL');}catch{}cleanup();},1500);kill.unref();},120000);
 child.once('message',message=>finish(message.ok?message.result:{state:'failed',error:message.error}));child.once('error',error=>{finish({state:'failed',error:error.message});cleanup();});child.once('exit',()=>{if(!settled)finish({state:'failed',error:'Lighthouse worker stopped before returning a report'});cleanup();});
 child.send({url,origins,localTesting:options.localTesting===true,userDataDir:dir});});}
