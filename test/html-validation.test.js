import test from 'node:test';
import assert from 'node:assert/strict';
import {validateMarkup} from '../src/html-validation.js';
import {analyzeSeo} from '../src/seo.js';
import {printableReport} from '../src/report.js';

const doc='<html lang="en"><head><title>Fixture</title></head><body><main><h1>Welcome</h1><h3>Skipped level</h3><img src="hero.png"></main></body></html>';
test('HTML-Validate flags structural markup issues without fetching the page or inventing scores',async()=>{
 const data=await validateMarkup(doc);
 assert.equal(data.state,'complete');
 assert.ok(data.count>0);
 assert.ok(data.issues.some(x=>x.rule==='heading-level'&&x.message.includes('expected <h2>')));
 assert.ok(data.issues.some(x=>x.rule==='wcag/h37'&&x.message.includes('alt')));
 assert.equal(data.issues.find(x=>x.rule==='heading-level').selector,'html > body > main > h3');
 assert.ok(data.limitations.some(x=>x.includes('not page speed')));
});
test('oversized markup is marked unavailable, not parsed as broken truncated HTML',async()=>{
 const data=await validateMarkup('<html>'+('x'.repeat(750_001))+'</html>');assert.equal(data.state,'unavailable');assert.match(data.reason,/exceeds 750 KB/);
});
test('printable report escapes HTML-Validate messages and selector evidence',async()=>{
 const seo=analyzeSeo({title:'Test',description:'',h1:['Hi'],canonical:'',robots:'',xRobotsTag:'',jsonLdCount:0,jsonLdInvalid:0,viewport:'',ogTitle:'',ogImage:''});seo.htmlValidation={state:'complete',count:1,issues:[{rule:'heading-level',severity:'error',message:'<script>not executed</script>',selector:'#bad',line:7,column:5,reference:'https://html-validate.org/rules/heading-level.html'}]};
 const html=printableReport({id:'1',url:'https://example.com',createdAt:'now',state:'complete',findings:[],incomplete:[],manual:{},seo,lighthouse:{state:'not-requested'}});
 assert.match(html,/HTML-Validate document diagnostics/);assert.match(html,/&lt;script&gt;not executed&lt;\/script&gt;/);assert.doesNotMatch(html,/<script>not executed<\/script>/);
});
