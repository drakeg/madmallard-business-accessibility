import dns from 'node:dns/promises';
import {existsSync} from 'node:fs';
import {chromium} from 'playwright';
import AxeBuilder from '@axe-core/playwright';
import {axeNode} from './evidence.js';
import {runLighthouse} from './lighthouse.js';
import {collectSeo} from './seo.js';
import {validateTarget} from './policy.js';
async function baseScan(url,origins,options={}) {
 await validateTarget(url,origins,undefined,options);
 const args=['--disable-dev-shm-usage'];
 if(options.localTesting&&existsSync('/.dockerenv')){const gateway=await dns.lookup('host.docker.internal');args.push(`--host-resolver-rules=MAP localhost ${gateway.address}`);}
 const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||undefined,headless:true,args});
 const timeout=setTimeout(()=>browser.close().catch(()=>{}),60000);
 try {
 const context=await browser.newContext({serviceWorkers:'block',acceptDownloads:false});
 await context.route('**/*',async route=>{
  const req=route.request();
  if(req.method()!=='GET') return route.abort();
  try {await validateTarget(req.url(),origins,undefined,options);await route.continue();}catch {await route.abort();}
 });
 const page=await context.newPage();page.setDefaultTimeout(20000);
 const response=await page.goto(url,{waitUntil:'domcontentloaded',timeout:25000});if(response&&response.status()>=400)throw new Error(`Target returned HTTP ${response.status()}; check its URL and accepted hostnames`);await page.waitForTimeout(500);
 const seo=await collectSeo(page,response);
 const result=await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21a','wcag21aa','wcag22aa']).analyze();
 return {url,seo,createdAt:new Date().toISOString(),engine:result.testEngine,findings:result.violations.flatMap(rule=>rule.nodes.map(node=>axeNode(rule,node))),incomplete:result.incomplete.map(x=>({id:x.id,help:x.help,helpUrl:x.helpUrl,description:x.description,tags:x.tags,nodes:x.nodes.length,instances:x.nodes.map(node=>axeNode(x,node,'needs-review'))})),manual:{keyboard:'not-tested',focus:'not-tested',zoom:'not-tested',screenReader:'not-tested'},limitations:['Automated findings are not conformance certification.','Configured origin and network controls apply; blocked assets or authentication can affect results.','DNS checks are defense in depth, not a network isolation boundary. Use restrictive egress in production.']};
 }finally{clearTimeout(timeout);await browser.close();}
}

export async function scan(url,origins,options={}){options.onProgress?.('Accessibility and on-page SEO');const result=await baseScan(url,origins,options);if(options.includeLighthouse){options.onProgress?.('Lighthouse lab audit');result.lighthouse=await runLighthouse(url,origins,options).catch(error=>({state:'failed',error:error.message}));}else result.lighthouse={state:'not-requested'};return result;}
