import test from 'node:test';
import assert from 'node:assert/strict';
import {axeNode,enrichAudit,auditSummary} from '../src/evidence.js';
import {printableReport} from '../src/report.js';
import {runLighthouse} from '../src/lighthouse.js';
import http from 'node:http';

const rule={id:'label',impact:'critical',help:'Input label',description:'Name required',helpUrl:'https://dequeuniversity.com/rules/axe/4.10/label',tags:['wcag2a']};
const node={target:['#email'],html:'<input id="email" onerror="alert(1)">',failureSummary:'Missing label <script>alert(2)</script>',any:[{id:'aria-label',message:'No accessible name',data:{value:0},relatedNodes:[{target:['#second'],html:'<input>'}]}],all:[],none:[]};
test('evidence, legacy records and printable reports preserve facts without executing captured HTML',()=>{
 const finding=axeNode(rule,node);assert.equal(finding.certainty,'confirmed');assert.equal(finding.checks.any[0].data.value,0);
 const a={id:'123',url:'https://example.test/?x=<script>',createdAt:'2026-11-14',state:'complete',findings:[finding],incomplete:[{id:'color-contrast',help:'Contrast',nodes:1,instances:[axeNode(rule,node,'needs-review')]}],seo:{checks:[{id:'title',title:'Title',status:'warning',detail:'Missing title <script>bad()</script>'}]},manual:{keyboard:'not-tested'},lighthouse:{state:'complete',categories:{seo:{title:'SEO',score:90}},raw:{secret:'large report'}}};
 const html=printableReport(a);assert.ok(html.startsWith('<!doctype html>'));assert.match(html,/&lt;input id=&quot;email&quot;/);assert.doesNotMatch(html,/<input id="email" onerror/);assert.doesNotMatch(html,/<script>alert\(2\)<\/script>/);assert.match(html,/Needs manual investigation/);assert.match(html,/No accessible name/);assert.match(html,/90 \/ 100/);
 const summary=auditSummary(a);assert.equal(summary.lighthouse.raw,undefined);
 const legacy=printableReport({id:'old',url:'https://example.test/',createdAt:'2020',state:'complete',findings:[{id:'label',target:['#old'],status:'open'}]});assert.match(legacy,/No HTML was captured in this historical audit/);assert.match(legacy,/No SEO snapshot exists/);assert.match(legacy,/Lighthouse data was not captured/);
 assert.equal(enrichAudit({findings:[],incomplete:[]}).reportVersion,2);
});

test('Lighthouse respects local-only opt-in and rejected origins',async()=>{
 const result=await runLighthouse('http://127.0.0.1:11/',[],{localTesting:false});assert.equal(result.state,'failed');assert.match(result.error,/blocked|network|private|reserved|standard web ports/i);
});

test('combined browser audit returns SEO, axe and optional Lighthouse evidence for an authorized local fixture',{timeout:160000,skip:!process.env.CHROMIUM_PATH?'Set CHROMIUM_PATH for real browser tests':false},async()=>{
 const {scan}=await import('../src/scanner.js');const fixture=http.createServer((req,res)=>{res.setHeader('Content-Type','text/html');res.end('<!doctype html><html lang="en"><head><title>Fixture site</title><meta name="description" content="A descriptive text"><meta name="viewport" content="width=device-width, initial-scale=1"></head><body><main><h1>Audit fixture</h1><input id="email"><img src="http://127.0.0.1:9/unapproved-resource.png"></main></body></html>')});
 await new Promise(resolve=>fixture.listen(0,'127.0.0.1',resolve));const url=`http://127.0.0.1:${fixture.address().port}/`;
 try {const result=await scan(url,[new URL(url).origin],{localTesting:true,includeLighthouse:true,onProgress:stage=>console.log(`fixture scan stage: ${stage}`)});assert.equal(result.seo.checks.length,8);assert.ok(result.findings.some(f=>f.id==='label'));assert.ok(result.findings.find(f=>f.id==='label').checks.any.length);assert.equal(result.lighthouse.state,'complete',result.lighthouse.error);for(const category of ['seo','performance','accessibility','best-practices'])assert.ok(category in result.lighthouse.categories);assert.ok(result.lighthouse.raw);assert.ok(result.lighthouse.blockedRequests>0,'unapproved subresources are blocked');assert.match(printableReport(result),/Lighthouse lab results/);
 }finally{fixture.closeAllConnections();await new Promise(resolve=>fixture.close(resolve));}
});

test('printable HTML is readable on desktop and mobile and captured markup stays inert',{timeout:30000,skip:!process.env.CHROMIUM_PATH?'Set CHROMIUM_PATH for real browser tests':false},async()=>{
 const {chromium}=await import('playwright');const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH,headless:true});
 try{const html=printableReport({id:'visual',url:'https://example.test/',state:'complete',createdAt:'2026-11-14',findings:[axeNode(rule,node)],incomplete:[],seo:{checks:[]}});
 for(const width of [390,1280]){const page=await browser.newPage({viewport:{width,height:900}});await page.setContent(html);assert.equal(await page.locator('article').count(),1);assert.equal(await page.locator('input').count(),0,'captured element is escaped as text');assert.ok(await page.getByText('Where on the page').isVisible());assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true,`no horizontal overflow at ${width}px`);await page.close();}
 }finally{await browser.close();}
});
