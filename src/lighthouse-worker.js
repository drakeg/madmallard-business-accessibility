import puppeteer from 'puppeteer-core';
import lighthouse,{desktopConfig} from 'lighthouse';
import {chromium} from 'playwright';
import {existsSync} from 'node:fs';
import dns from 'node:dns/promises';
import {validateTarget} from './policy.js';
process.once('message',async input=>{let browser,pw;try{
 const {url,origins,localTesting,userDataDir}=input;const options={localTesting};await validateTarget(url,origins,undefined,options);
 const args=['--no-sandbox','--disable-dev-shm-usage','--disable-background-networking','--disable-extensions'];if(localTesting&&existsSync('/.dockerenv')){const gateway=await dns.lookup('host.docker.internal');args.push(`--host-resolver-rules=MAP localhost ${gateway.address}`);}
 browser=await puppeteer.launch({executablePath:process.env.CHROMIUM_PATH||chromium.executablePath(),headless:true,userDataDir,args});
 // Attach the existing context-wide Playwright guard so popups/frames are covered too.
 // Chrome's random debugging socket is loopback-only and is never published by Docker.
 pw=await chromium.connectOverCDP(browser.wsEndpoint());const context=pw.contexts()[0];let blocked=0;
 await context.route('**/*',async route=>{const request=route.request();if(request.method()!=='GET'){blocked++;return route.abort();}try{await validateTarget(request.url(),origins,undefined,options);await route.continue();}catch{blocked++;await route.abort();}});
 const page=await browser.newPage();await page.setBypassServiceWorker(true);
 const result=await lighthouse(url,{logLevel:'error',onlyCategories:['performance','accessibility','best-practices','seo'],throttlingMethod:'provided',maxWaitForLoad:30000,disableStorageReset:true},desktopConfig,page);
 if(!result?.lhr||result.lhr.runtimeError)throw new Error(result?.lhr?.runtimeError?.message||'Lighthouse did not return a result');
 const lhr=result.lhr;const categories=Object.fromEntries(Object.entries(lhr.categories).map(([id,c])=>[id,{title:c.title,score:c.score===null?null:Math.round(c.score*100)}]));
 const audits=Object.values(lhr.audits).filter(a=>a.score!==1&&a.scoreDisplayMode!=='notApplicable').map(a=>({id:a.id,title:a.title,description:a.description,score:a.score,scoreDisplayMode:a.scoreDisplayMode,displayValue:a.displayValue,explanation:a.explanation,errorMessage:a.errorMessage,details:a.details}));
 const payload={state:'complete',version:lhr.lighthouseVersion,fetchTime:lhr.fetchTime,categories,audits,blockedRequests:blocked,warnings:lhr.runWarnings||[],method:'Desktop lab run on this host, provided throttling; results vary with environment. Network restrictions remain active.',raw:lhr};
 await browser.close();browser=null;await pw.close().catch(()=>{});pw=null;process.send({ok:true,result:payload},()=>process.exit(0));
 }catch(error){if(browser)await browser.close().catch(()=>{});if(pw)await pw.close().catch(()=>{});process.send({ok:false,error:error.message},()=>process.exit(1));}});
