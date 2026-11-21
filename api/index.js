import {readFile} from 'node:fs/promises';
import {randomUUID} from 'node:crypto';
import {database,configured,one,all,execute} from '../src/cloud-db.js';
import {publicUser,verifyPassword,createUser,rate,identity,createSession,logout,setToken,verifyBootstrap,verifyCsrf,generateToken,encodePassword} from '../src/cloud-auth.js';
import {auditSummary,enrichAudit} from '../src/evidence.js';
import {printableReport} from '../src/report.js';
import {parseTarget,compare} from '../src/policy.js';
import {SCAN_LEASE_MS,recoverInterruptedScans,setScanProgress,finishScan} from '../src/cloud-scan-lifecycle.js';

const staticFiles={'/':'index.html','/index.html':'index.html','/login':'account.html','/profile':'account.html','/app.js':'app.js','/account.js':'account.js','/dashboard.js':'dashboard.js','/guidance.js':'guidance.js','/style.css':'style.css','/daisyui.css':'daisyui.css','/third-party-notices':'third-party-notices.txt'};
const contentType=path=>path.endsWith('.js')?'text/javascript; charset=utf-8':path.endsWith('.css')?'text/css; charset=utf-8':path==='/third-party-notices'?'text/plain; charset=utf-8':'text/html; charset=utf-8';
const send=(res,status,body)=>{res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'});res.end(JSON.stringify(body));};
const respondHtml=(res,html,name)=>{res.writeHead(200,{'Content-Type':'text/html; charset=utf-8','Content-Disposition':`attachment; filename="${name}"`,'Cache-Control':'no-store','Content-Security-Policy':"sandbox; default-src 'none'; style-src 'unsafe-inline'; img-src data:"});res.end(html);};
const body=async req=>{let value='';for await(const part of req){value+=part;if(Buffer.byteLength(value)>32768)throw Object.assign(new Error('Request body too large'),{status:413});}try{return JSON.parse(value||'{}');}catch{throw Object.assign(new Error('Invalid JSON body'),{status:400});}};
const allowedOrigins=()=>String(process.env.ALLOWED_ORIGINS||'').split(',').map(v=>v.trim()).filter(Boolean);
const currentUser=async(db,account)=>one(db,'SELECT * FROM users WHERE id=?',[account.user.id]);
const canSee=(account,a)=>a&&(account.user.role==='admin'||a.ownerId===account.user.id);
const getAudit=async(db,id)=>{const row=await one(db,'SELECT body FROM audits WHERE id=?',[id]);return row?JSON.parse(row.body):null;};
const storeAudit=async(db,a)=>{a={...a,id:a.id||randomUUID()};await execute(db,'INSERT INTO audits(id,body) VALUES(?,?) ON CONFLICT(id) DO UPDATE SET body=excluded.body',[a.id,JSON.stringify(a)]);return a;};
const releaseLease=async(db,a)=>{await execute(db,'DELETE FROM scan_lease WHERE id=1 AND audit_id=?',[a.id]);};

async function scheduleScan(db,a,origins){
 const job=(async()=>{
  try{
   const {scan}=await import('../src/scanner.js');
   const result=await scan(a.url,origins,{localTesting:false,includeLighthouse:false,onProgress:stage=>{setScanProgress(db,a.id,stage).catch(error=>console.error('Scan progress update failed:',error.message));}});
   if(!await finishScan(db,{...result,id:a.id,ownerId:a.ownerId,includeLighthouse:false,stage:'Complete',state:'complete'}))console.warn('Discarded late scan completion:',a.id);
  }catch(error){
   console.error('Audit failed:',a.id,String(error.message||error).slice(0,240));
   if(!await finishScan(db,{...a,state:'failed',stage:'Failed',error:String(error.message||error).slice(0,600)}))console.warn('Discarded late scan failure:',a.id);
  }finally{await releaseLease(db,a);}
 })();
 // Vercel Fluid Compute keeps the function alive to complete a bounded job after a 202 response.
 if(process.env.VERCEL){const {waitUntil}=await import('@vercel/functions');waitUntil(job);}else job.catch(error=>console.error('Background scan:',error.message));
}

export default async function handler(req,res){
 res.setHeader('X-Content-Type-Options','nosniff');res.setHeader('Referrer-Policy','no-referrer');res.setHeader('Content-Security-Policy',"default-src 'self'; script-src 'self'; style-src 'self'; connect-src 'self'; frame-ancestors 'none'");
 try{
  const routed=new URL(req.url||'/','http://local.invalid');const path='/'+String(routed.searchParams.get('__path')||'').replace(/^\/+/, '');
  const pathname=routed.searchParams.has('__path')?path:new URL(req.url,'http://local.invalid').pathname;
  const method=req.method||'GET';
  if(method==='GET'&&staticFiles[pathname]){const file=staticFiles[pathname];res.writeHead(200,{'Content-Type':contentType(pathname),'Cache-Control':'no-store'});return res.end(await readFile(new URL('../public/'+file,import.meta.url)));}
  if(method==='GET'&&pathname==='/healthz')return send(res,configured()?200:503,{status:configured()?'ok':'database-unconfigured',platform:'vercel'});
  if(!pathname.startsWith('/api/'))return send(res,404,{error:'Not found'});
  if(!configured())return send(res,503,{error:'Database not configured. Connect a managed Postgres or Turso database in Vercel Storage first.'});
  const db=await database();
  const host=String(req.headers['x-forwarded-host']||req.headers.host||'').split(',')[0].trim();
  if(['POST','PUT','PATCH','DELETE'].includes(method)&&(req.headers.origin!==undefined&&req.headers.origin!==`https://${host}`||req.headers['sec-fetch-site']==='cross-site'))return send(res,403,{error:'Cross-site request blocked'});
  if(method==='GET'&&pathname==='/api/auth/status'){const row=await one(db,'SELECT COUNT(*) AS n FROM users');const needsSetup=Number(row.n)===0;return send(res,200,{needsSetup,setupAvailable:!needsSetup||Boolean(process.env.ADMIN_SETUP_TOKEN?.length>=32)});}
  if(method==='POST'&&['/api/auth/setup','/api/auth/login'].includes(pathname)){
   const b=await body(req),username=String(b.username||'').trim().toLowerCase(),ip=String(req.headers['x-forwarded-for']||req.socket.remoteAddress||'unknown').split(',')[0];
   if(!await rate(db,'address:'+ip)||!await rate(db,ip+':'+username))return send(res,429,{error:'Too many attempts; retry in 15 minutes'});
   let user;
   if(pathname==='/api/auth/setup'){
    if((await one(db,'SELECT COUNT(*) AS n FROM users')).n>0)return send(res,409,{error:'Administrator account already exists'});
    if(!process.env.ADMIN_SETUP_TOKEN||process.env.ADMIN_SETUP_TOKEN.length<32)return send(res,503,{error:'Set ADMIN_SETUP_TOKEN in Vercel before creating the first administrator. This is a one-time setup secret, not an API token.'});
    if(!verifyBootstrap(b.bootstrapToken))return send(res,401,{error:'Invalid administrator setup secret'});
    user=await createUser(db,{...b,role:'admin'},true);
   }else{
    user=await one(db,'SELECT * FROM users WHERE username=?',[username]);
    const valid=await verifyPassword(b.password,user?.password||'131072:'+'0'.repeat(32)+':'+'0'.repeat(128));
    if(!user||!valid)return send(res,401,{error:'Invalid username or password'});
   }
   const csrf=await createSession(db,user,res);return send(res,200,{user:publicUser(user),csrf});
  }
  const account=await identity(db,req);if(!account)return send(res,401,{error:'Sign in required'});
  if(['POST','PUT','PATCH','DELETE'].includes(method)&&!verifyCsrf(req,account))return send(res,403,{error:'Session verification failed; sign in again'});
  const admin=account.user.role==='admin';
  if(method==='GET'&&pathname==='/api/me')return send(res,200,{user:publicUser(account.user),csrf:account.session?.csrf||null});
  if(method==='POST'&&pathname==='/api/auth/logout'){await logout(db,account.session,res);return send(res,200,{ok:true});}
  if(method==='PATCH'&&pathname==='/api/profile'){
   const b=await body(req);if(typeof b.name!=='string'||!b.name.trim()||b.name.length>100)throw new Error('Name must be 1–100 characters');
   await execute(db,'UPDATE users SET name=? WHERE id=?',[b.name.trim(),account.user.id]);return send(res,200,{ok:true});
  }
  if(method==='POST'&&pathname==='/api/profile/token'){
   const b=await body(req),user=await currentUser(db,account);
   if(!await verifyPassword(b.password,user.password))return send(res,401,{error:'Confirm your account password'});
   const token=b.generate===true?generateToken():b.token;await setToken(db,user.id,token);return send(res,200,{token});
  }
  if(method==='POST'&&pathname==='/api/profile/password'){
   const b=await body(req),user=await currentUser(db,account);
   if(!await verifyPassword(b.currentPassword,user.password))return send(res,401,{error:'Current password is incorrect'});
   await execute(db,'UPDATE users SET password=? WHERE id=?',[await encodePassword(b.password),user.id]);await execute(db,'DELETE FROM sessions WHERE user_id=?',[user.id]);await logout(db,account.session,res);return send(res,200,{ok:true});
  }
  if(pathname==='/api/customers'){
   if(!admin)return send(res,403,{error:'Administrator access required'});
   if(method==='GET'){const rows=await all(db,'SELECT * FROM users ORDER BY username');return send(res,200,{customers:rows.map(publicUser)});}
   if(method==='POST'){const user=await createUser(db,{...(await body(req)),role:'customer'});return send(res,201,{user:publicUser(user)});}
  }
  if(!['GET','HEAD'].includes(method)&&pathname.startsWith('/api/audits')&&!admin)return send(res,403,{error:'Customer access is read-only'});
  if(method==='GET'&&pathname==='/api/audits'){
   await recoverInterruptedScans(db);
   const rows=admin?await all(db,'SELECT body FROM audits ORDER BY rowid DESC LIMIT 100'):await all(db,"SELECT body FROM audits WHERE json_extract(body,'$.ownerId')=? ORDER BY rowid DESC LIMIT 100",[account.user.id]);
   return send(res,200,{audits:rows.map(r=>auditSummary(JSON.parse(r.body))),allowedOrigins:admin?allowedOrigins():[],localTesting:false,lighthouseAvailable:false});
  }
  if(method==='DELETE'&&pathname==='/api/audits'){
   await recoverInterruptedScans(db);
   const lease=await one(db,'SELECT * FROM scan_lease WHERE id=1 AND expires>?',[Date.now()]);if(lease)return send(res,409,{error:'Wait for a running scan to finish'});
   const result=await execute(db,'DELETE FROM audits');return send(res,200,{deleted:Number(result.rowsAffected)});
  }
  if(method==='POST'&&pathname==='/api/audits'){
   await recoverInterruptedScans(db);
   const b=await body(req);if(b.permissionConfirmed!==true)throw new Error('Confirm site-owner permission');
   if(typeof b.includeLighthouse!=='boolean'&&b.includeLighthouse!==undefined)throw new Error('Invalid Lighthouse setting');
   if(b.includeLighthouse===true)return send(res,422,{error:'Lighthouse is not enabled on the Vercel runtime. Use the regular axe, SEO and HTML-Validate audit.'});
   const origins=allowedOrigins(),url=parseTarget(b.url,origins,{localTesting:false}).href;
   const {validateTarget}=await import('../src/policy.js');await validateTarget(url,origins);
   const ownerId=b.ownerId||account.user.id;
   if(!await one(db,'SELECT id FROM users WHERE id=?',[ownerId]))throw new Error('Unknown scan owner');
   const id=randomUUID(),now=Date.now();
   const lease=await execute(db,'INSERT INTO scan_lease(id,audit_id,expires) VALUES (1,?,?) ON CONFLICT(id) DO UPDATE SET audit_id=excluded.audit_id,expires=excluded.expires WHERE scan_lease.expires<?',[id,now+SCAN_LEASE_MS,now]);
   if(Number(lease.rowsAffected)!==1)return send(res,409,{error:'A scan is already running; retry when complete'});
   let a;
   try{
    a=await storeAudit(db,{id,url,ownerId,includeLighthouse:false,stage:'Accessibility and on-page SEO',state:'running',createdAt:new Date().toISOString()});
    await scheduleScan(db,a,origins);
   }catch(error){await releaseLease(db,{id});throw error;}
   return send(res,202,a);
  }
  const match=pathname.match(/^\/api\/audits\/([a-f0-9-]+)(\/export|\/report\.html|\/lighthouse\.html)?$/);
  if(match){const a=await getAudit(db,match[1]);if(!canSee(account,a))return send(res,404,{error:'Audit not found'});
   if(method==='GET'){
    if(match[2]==='/report.html')return respondHtml(res,printableReport(a),`audit-${a.id}.html`);
    if(match[2]==='/lighthouse.html')return send(res,404,{error:'Lighthouse is not available on this platform'});
    return send(res,200,enrichAudit(a));
   }
   if(method==='DELETE'){if(a.state==='running')throw new Error('Wait for scan completion');await execute(db,'DELETE FROM audits WHERE id=?',[a.id]);return send(res,200,{deleted:true});}
   if(method==='PATCH'){
    const b=await body(req);
    if(b.ownerId){if(a.state==='running')throw new Error('Wait for scan completion');if(!await one(db,'SELECT id FROM users WHERE id=?',[b.ownerId]))throw new Error('Unknown owner');return send(res,200,await storeAudit(db,{...a,ownerId:b.ownerId}));}
    if(a.state!=='complete')throw new Error('Only completed audits can be reviewed');
    if(Number.isInteger(b.findingIndex)&&a.findings[b.findingIndex]){
     if(!['open','planned','fixed','dismissed'].includes(b.status))throw new Error('Invalid status');
     if(typeof b.note!=='string'||b.note.length>2000)throw new Error('Note required, maximum 2000 characters');
     if(['fixed','dismissed'].includes(b.status)&&!b.note.trim())throw new Error('Evidence or reason required');
     a.findings[b.findingIndex]={...a.findings[b.findingIndex],status:b.status,note:b.note};
    }else if(b.manual&&Object.keys(b.manual).length){for(const [k,v] of Object.entries(b.manual)){if(!(k in a.manual)||!['not-tested','pass','fail'].includes(v))throw new Error('Invalid manual check');a.manual[k]=v;}}
    else throw new Error('No valid review update');return send(res,200,await storeAudit(db,a));
   }
  }
  if(method==='GET'&&pathname==='/api/compare'){
   const before=await getAudit(db,routed.searchParams.get('before')),after=await getAudit(db,routed.searchParams.get('after'));
   if(!canSee(account,before)||!canSee(account,after)||before.state!=='complete'||after.state!=='complete')throw new Error('Select two completed audits');
   return send(res,200,compare(before,after));
  }
  return send(res,404,{error:'Not found'});
 }catch(error){const status=error.status||(/SQLITE_CONSTRAINT|UNIQUE constraint|duplicate key/i.test(error.message)?409:/Invalid|Unknown|Only |Wait |Confirm|must |required|Select |No valid|Private|reserved|local network|standard web ports|Target origin|Use HTTP|Use a password/i.test(error.message)?400:500);if(status>=500)console.error('Request failed:',error.name,error.code||'',String(error.message||error).slice(0,220));return send(res,status,{error:status===409?'Username or token is already in use':status===500?'Service request failed; check server logs':String(error.message||error).slice(0,500)});}
}
