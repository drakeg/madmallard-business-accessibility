import {chromium} from 'playwright';
import AxeBuilder from '@axe-core/playwright';
import {validateTarget} from './policy.js';
export async function scan(url,origins) {
 await validateTarget(url,origins);
 const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||undefined,headless:true,args:['--disable-dev-shm-usage']});
 const timeout=setTimeout(()=>browser.close().catch(()=>{}),60000);
 try {
 const context=await browser.newContext({serviceWorkers:'block',acceptDownloads:false});
 await context.route('**/*',async route=>{
  const req=route.request();
  if(req.method()!=='GET') return route.abort();
  try {await validateTarget(req.url(),origins);await route.continue();}catch {await route.abort();}
 });
 const page=await context.newPage();page.setDefaultTimeout(20000);
 await page.goto(url,{waitUntil:'domcontentloaded',timeout:25000});await page.waitForTimeout(500);
 const result=await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21a','wcag21aa','wcag22aa']).analyze();
 return {url,createdAt:new Date().toISOString(),engine:result.testEngine,findings:result.violations.flatMap(rule=>rule.nodes.map(node=>({id:rule.id,impact:rule.impact,description:rule.description,help:rule.help,helpUrl:rule.helpUrl,target:node.target,summary:node.failureSummary,status:'open',note:''}))),incomplete:result.incomplete.map(x=>({id:x.id,help:x.help,nodes:x.nodes.length})),manual:{keyboard:'not-tested',focus:'not-tested',zoom:'not-tested',screenReader:'not-tested'},limitations:['Automated findings are not conformance certification.','Only operator-approved origins loaded; blocked assets or authentication can affect results.','DNS checks are defense in depth, not a network isolation boundary. Use restrictive egress in production.']};
 }finally{clearTimeout(timeout);await browser.close();}
}
