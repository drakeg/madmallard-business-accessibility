import {HtmlValidate} from 'html-validate';

// This performs local, offline document analysis only. It never visits URLs.
// A bounded source size avoids sending large/infinite client-rendered DOMs to the parser.
const validator=new HtmlValidate({extends:['html-validate:recommended','html-validate:document'],rules:{'doctype-style':'off','attr-quotes':'off','attr-case':'off','element-case':'off','void-style':'off','no-trailing-whitespace':'off'}});
const MAX_DOCUMENT_BYTES=750_000;
const MAX_REPORTED_ISSUES=40;

export async function validateMarkup(html){
 if(typeof html!=='string'||!html.trim())return {state:'unavailable',reason:'No HTML document was captured.'};
 if(Buffer.byteLength(html,'utf8')>MAX_DOCUMENT_BYTES)return {state:'unavailable',reason:'Rendered HTML exceeds 750 KB; validation skipped rather than reporting incomplete markup as errors.'};
 try{
  const result=await validator.validateString(html,'captured-page.html');
  const all=result.results.flatMap(r=>r.messages);
  return {state:'complete',engine:'HTML-Validate',count:all.length,truncated:all.length>MAX_REPORTED_ISSUES,issues:all.slice(0,MAX_REPORTED_ISSUES).map(m=>({rule:m.ruleId||'unknown',severity:m.severity===2?'error':'warning',message:m.message,selector:m.selector||null,line:m.line??null,column:m.column??null,reference:m.ruleUrl?.startsWith('https://html-validate.org/')?m.ruleUrl:null})),limitations:['HTML-Validate checks local document structure and markup, not page speed, keyword rankings, backlinks or Core Web Vitals.','Rendered DOM may differ from the original server HTML.','Validation findings are diagnostic markup issues and may overlap axe findings; they are not evidence of SEO ranking impact.']};
 }catch(error){return {state:'unavailable',reason:`Markup validation could not finish: ${String(error.message||error).slice(0,250)}`};}
}
