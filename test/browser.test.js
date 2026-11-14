import test from 'node:test';
import assert from 'node:assert/strict';
import {chromium} from 'playwright';
import AxeBuilder from '@axe-core/playwright';
import {existsSync} from 'node:fs';
const executablePath=process.env.CHROMIUM_PATH;
test('real browser detects an unlabeled input and confirms its repair', {skip:!executablePath&&!existsSync(chromium.executablePath())?'No installed Chromium; set CHROMIUM_PATH':false},async()=>{
 const browser=await chromium.launch({executablePath,headless:true});
 try{
 const context=await browser.newContext();const page=await context.newPage();page.setDefaultTimeout(10000);
 await page.route('https://fixture.example/**',route=>route.fulfill({contentType:'text/html',body:'<!doctype html><html lang="en"><head><title>Audit fixture</title></head><body><main><h1>Contact</h1><input id="email" type="email"></main></body></html>'}));
 await page.goto('https://fixture.example/');const before=await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa']).analyze();assert.ok(before.violations.some(x=>x.id==='label'));
 await page.locator('#email').evaluate(el=>el.setAttribute('aria-label','Email address'));
 const after=await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa']).analyze();assert.ok(!after.violations.some(x=>x.id==='label'));
 }finally{await browser.close();}
});

test('browser UI loads an audit and saves a reviewed finding',{skip:!executablePath&&!existsSync(chromium.executablePath())?'No installed Chromium; set CHROMIUM_PATH':false},async()=>{
 const {spawn}=await import('node:child_process');const {once}=await import('node:events');const {mkdtempSync,rmSync}=await import('node:fs');const {tmpdir}=await import('node:os');const {Store}=await import('../src/store.js');
 const dir=mkdtempSync(tmpdir()+'/audit-ui-');const store=new Store(dir+'/db');store.save({url:'https://fixture.example/',createdAt:new Date().toISOString(),state:'complete',findings:[{id:'label',impact:'critical',help:'Input needs a label',summary:'Missing accessible name',target:['#email'],status:'open',note:''}],incomplete:[],manual:{keyboard:'not-tested'}});store.close();
 const port=30000+Math.floor(Math.random()*10000);const token='browser-fixture-token-'.repeat(3);const child=spawn(process.execPath,['src/server.js'],{env:{...process.env,PORT:String(port),HOST:'127.0.0.1',API_TOKEN:token,ALLOWED_ORIGINS:'https://fixture.example',DB_PATH:dir+'/db'},stdio:'pipe'});let browser;
 try{
 const base=`http://127.0.0.1:${port}`;let ready=false;for(let i=0;i<80;i++){try{if((await fetch(base+'/healthz')).ok){ready=true;break;}}catch{}await new Promise(r=>setTimeout(r,50));}assert.ok(ready);
 browser=await chromium.launch({executablePath,headless:true});const context=await browser.newContext();const page=await context.newPage();page.setDefaultTimeout(10000);const errors=[];page.on('pageerror',e=>errors.push(e.message));await page.goto(base,{waitUntil:'domcontentloaded',timeout:15000});await page.getByLabel('Operator token').fill(token);await page.getByRole('button',{name:'Load audits'}).click();await page.getByRole('button',{name:'Review',exact:true}).click();await page.getByLabel('Review status').selectOption('fixed');await page.getByLabel('Evidence or reason').fill('Label repaired and independently checked');await page.getByRole('button',{name:'Save review'}).click();await page.getByRole('status').filter({hasText:'Review saved'}).waitFor();assert.deepEqual(errors,[]);
 const db=new Store(dir+'/db');assert.equal(db.list()[0].findings[0].status,'fixed');db.close();
 }finally{if(browser)await browser.close();child.kill('SIGTERM');await once(child,'exit');rmSync(dir,{recursive:true});}
});

test('empty audit history gives visible connection feedback and attribution',{skip:!executablePath&&!existsSync(chromium.executablePath())?'No installed Chromium; set CHROMIUM_PATH':false},async()=>{
 const browser=await chromium.launch({executablePath,headless:true});
 try{const context=await browser.newContext();const page=await context.newPage();page.setDefaultTimeout(10000);
 const {readFileSync}=await import('node:fs');
 await page.route('http://workbench.test/**',route=>{const path=new URL(route.request().url()).pathname;if(path==='/api/audits')return route.fulfill({json:{audits:[],allowedOrigins:[],localTesting:true}});return route.fulfill({contentType:path==='/app.js'?'text/javascript':path==='/style.css'?'text/css':'text/html',body:readFileSync('public/'+(path==='/'?'index.html':path.slice(1)),'utf8')});});
 await page.goto('http://workbench.test/');await page.getByRole('button',{name:'Load audits'}).click();await page.getByText('Paste your operator token first.').waitFor();await page.getByLabel('Operator token').fill('test-token');await page.getByRole('button',{name:'Load audits'}).click();await page.getByText('Connected. 0 audit(s) loaded.').waitFor();await page.getByText('No audits yet.',{exact:false}).waitFor();assert.equal(await page.locator('footer a[href="https://github.com/dequelabs/axe-core"]').count(),1);assert.equal(await page.locator('footer a[href="https://github.com/microsoft/playwright"]').count(),1);
 }finally{await browser.close();}
});
