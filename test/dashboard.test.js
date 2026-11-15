import test from 'node:test';import assert from 'node:assert/strict';
import {summarizeAudits} from '../public/dashboard.js';
import {analyzeSeo} from '../src/seo.js';
test('dashboard uses latest completed page scans, excludes resolved findings and labels SEO coverage',()=>{
 const now=new Date(2026,10,14,12);const when=offset=>{const d=new Date(now);d.setDate(d.getDate()+offset);return d.toISOString();};
 const old={url:'https://example.com/a',state:'complete',createdAt:when(-10),findings:[{impact:'critical'}],seo:{checks:[{status:'review'}]}};
 const latest={...old,createdAt:when(0),findings:[{impact:'serious',status:'open'},{impact:'minor',status:'fixed'},{impact:'critical',status:'dismissed'}],seo:{checks:[{status:'review'},{status:'pass'},{status:'info'}]}};
 const b={url:'https://example.com/b',state:'complete',createdAt:when(-1),findings:[{impact:null,status:'planned'}]};const result=summarizeAudits([old,latest,b,{state:'failed',createdAt:when(0)},{state:'running',createdAt:when(0)}],now);
 assert.equal(result.total,5);assert.equal(result.completed,3);assert.equal(result.pages,2);assert.equal(result.findings,2);assert.equal(result.severity.critical,0);assert.equal(result.severity.serious,1);assert.equal(result.severity.review,1);assert.equal(result.seoPages,1);assert.equal(result.seoReview,1);assert.equal(result.days.length,7);assert.equal(result.days[6].failed,1);assert.equal(result.days[6].complete,1);assert.equal(result.days[6].running,1);
 const empty=summarizeAudits([],now);assert.equal(empty.total,0);assert.equal(empty.findings,0);assert.equal(empty.seoPages,0);
});
test('SEO checks distinguish observed syntax from indexing/ranking assumptions',()=>{
 const result=analyzeSeo({title:'',description:'',h1:[],canonical:'javascript:alert(1)',robots:'noindex, nofollow',xRobotsTag:'',jsonLdCount:1,jsonLdInvalid:1,viewport:'',ogTitle:'',ogImage:''});
 const status=id=>result.checks.find(c=>c.id===id).status;assert.equal(status('title'),'fail');assert.equal(status('description'),'review');assert.equal(status('canonical'),'fail');assert.equal(status('robots'),'review');assert.equal(status('structured-data'),'fail');assert.match(result.limitations.join(' '),/not an SEO score/);
 const clean=analyzeSeo({title:'Example',description:'Summary',h1:['Welcome'],canonical:'https://example.com/',robots:'',xRobotsTag:'noindex',jsonLdCount:0,jsonLdInvalid:0,viewport:'width=device-width',ogTitle:'Example',ogImage:'image.png'});assert.equal(clean.checks.find(c=>c.id==='robots').status,'review');assert.equal(clean.checks.find(c=>c.id==='structured-data').status,'info');
});
