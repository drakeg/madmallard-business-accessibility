export function analyzeSeo(snapshot){
 const checks=[];const add=(id,title,status,detail)=>checks.push({id,title,status,detail});
 add('title','Page title',snapshot.title?'pass':'fail',snapshot.title||'No page title found. Add a descriptive title for this page.');
 add('description','Meta description',snapshot.description?'pass':'review',snapshot.description||'No meta description found. Consider a useful summary for search snippets; search engines may choose different text.');
 add('headings','Top-level heading',snapshot.h1.length===1?'pass':'review',`${snapshot.h1.length} H1 heading(s). ${snapshot.h1.length===1?snapshot.h1[0]:'Review the page outline; this is an editorial check, not a ranking rule.'}`);
 let canonicalOk=false;try{canonicalOk=['http:','https:'].includes(new URL(snapshot.canonical).protocol);}catch{}
 add('canonical','Canonical URL',canonicalOk?'pass':snapshot.canonical?'fail':'review',canonicalOk?snapshot.canonical:snapshot.canonical?'Canonical is not a valid HTTP(S) URL.':'No canonical link found. Review whether this page needs one.');
 const noindex=/\bnoindex\b/i.test(snapshot.robots+' '+snapshot.xRobotsTag);
 add('robots','Indexing directives',noindex?'review':'info',noindex?'A noindex directive is present. This may be intentional for staging, private or account pages.':'No noindex directive observed in this response or page. This does not prove search-engine indexability; robots.txt and other factors are not checked.');
 add('structured-data','Structured-data syntax',snapshot.jsonLdInvalid?'fail':snapshot.jsonLdCount?'pass':'info',snapshot.jsonLdInvalid?`${snapshot.jsonLdInvalid} JSON-LD block(s) could not be parsed.`:snapshot.jsonLdCount?`${snapshot.jsonLdCount} JSON-LD block(s) parsed. Schema validity and rich-result eligibility are not assessed.`:'No JSON-LD blocks found. Structured data is optional and depends on the page type.');
 add('viewport','Mobile viewport metadata',snapshot.viewport?'pass':'review',snapshot.viewport||'No viewport meta tag found. Review mobile rendering.');
 add('social-preview','Social preview metadata',snapshot.ogTitle&&snapshot.ogImage?'pass':'info',snapshot.ogTitle&&snapshot.ogImage?'Open Graph title and image are present. Preview rendering was not tested.':'Open Graph title or image is missing; review if social sharing is important.');
 return {...snapshot,version:1,checks,limitations:['Single rendered page, not a crawl.','No paid provider, keyword volume, backlinks, ranking data, robots.txt fetch or search-engine index verification.','Checks are review aids, not an SEO score or ranking guarantee.']};
}
export async function collectSeo(page,response){const snapshot=await page.evaluate(()=>{
 const content=selector=>(document.querySelector(selector)?.getAttribute('content')||'').trim().slice(0,2000);
 let invalid=0;const blocks=[...document.querySelectorAll('script[type="application/ld+json"]')];for(const block of blocks){try{JSON.parse(block.textContent);}catch{invalid++;}}
 return {url:location.href,title:document.title.trim().slice(0,2000),description:content('meta[name="description" i]'),h1:[...document.querySelectorAll('h1')].slice(0,50).map(h=>h.textContent.trim().slice(0,300)),canonical:document.querySelector('link[rel="canonical" i]')?.href||'',robots:[...document.querySelectorAll('meta[name="robots" i],meta[name="googlebot" i]')].map(m=>m.content).join(', ').slice(0,2000),viewport:content('meta[name="viewport" i]'),ogTitle:content('meta[property="og:title" i]'),ogImage:content('meta[property="og:image" i]'),jsonLdCount:blocks.length,jsonLdInvalid:invalid};
 });snapshot.xRobotsTag=await response?.headerValue('x-robots-tag')||'';return analyzeSeo(snapshot);}
