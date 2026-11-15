import http from 'node:http';
import {readFile} from 'node:fs/promises';
import {randomBytes} from 'node:crypto';
import {Auth} from './auth.js';
import {Store} from './store.js';
import {scan} from './scanner.js';
import {compare,parseTarget} from './policy.js';
const token=process.env.API_TOKEN;
if(!token||token.length<32) throw new Error('Set API_TOKEN to at least 32 characters');
const localTesting=process.env.LOCAL_TESTING==='true';
const origins=(process.env.ALLOWED_ORIGINS||'').split(',').map(x=>x.trim()).filter(Boolean);
for(const origin of origins) if(new URL(origin).origin!==origin) throw new Error('ALLOWED_ORIGINS must contain exact URL origins');
const store=new Store(process.env.DB_PATH||'data/audits.sqlite');
const auth=new Auth(store.db);const secureCookies=process.env.COOKIE_SECURE==='true'||(process.env.COOKIE_SECURE===undefined&&process.env.NODE_ENV==='production');
const isAdmin=x=>x.user.role==='admin';
const canSee=(x,a)=>a&&(isAdmin(x)||a.ownerId===x.user.id);
const visible=x=>isAdmin(x)?store.list():store.db.prepare("SELECT body FROM audits WHERE json_extract(body,'$.ownerId')=? ORDER BY rowid DESC LIMIT 100").all(x.user.id).map(row=>JSON.parse(row.body));
// A crashed job is never reported as successful on restart.
for(const a of store.list()) if(a.state==='running') store.save({...a,state:'failed',error:'Process restarted during scan; rerun after review'});
let busy=false;
const send=(res,status,body)=>{res.writeHead(status,{'Content-Type':'application/json','Cache-Control':'no-store'});res.end(JSON.stringify(body));};
async function body(req){let s='';for await(const c of req){s+=c;if(Buffer.byteLength(s)>32768)throw new Error('Request too large');}return JSON.parse(s||'{}');}
const server=http.createServer(async(req,res)=>{
 res.setHeader('X-Content-Type-Options','nosniff');res.setHeader('Referrer-Policy','no-referrer');res.setHeader('Content-Security-Policy',"default-src 'self'; script-src 'self'; style-src 'self'; connect-src 'self'; frame-ancestors 'none'");
 try {
 const u=new URL(req.url,'http://localhost');
 if(req.method==='GET'&&u.pathname==='/healthz')return send(res,200,{status:'ok'});
 const files={'/':'index.html','/app.js':'app.js','/dashboard.js':'dashboard.js','/style.css':'style.css','/third-party-notices':'third-party-notices.txt','/login':'account.html','/profile':'account.html','/account.js':'account.js'};
 if(req.method==='GET'&&files[u.pathname]){res.writeHead(200,{'Content-Type':u.pathname.endsWith('.js')?'text/javascript':u.pathname.endsWith('.css')?'text/css':u.pathname==='/third-party-notices'?'text/plain; charset=utf-8':'text/html','Cache-Control':'no-store'});return res.end(await readFile(new URL('../public/'+files[u.pathname],import.meta.url)));}
 const sameOrigin=()=>!req.headers.origin||req.headers.origin===`${secureCookies?'https':'http'}://${req.headers.host}`;
 if(['POST','PUT','PATCH','DELETE'].includes(req.method)&&(!sameOrigin()||req.headers['sec-fetch-site']==='cross-site'))return send(res,403,{error:'Cross-site request blocked'});
 if(req.method==='GET'&&u.pathname==='/api/auth/status')return send(res,200,{needsSetup:auth.count()===0});
 if(req.method==='POST'&&['/api/auth/setup','/api/auth/login'].includes(u.pathname)){
  const b=await body(req);const username=String(b.username||'').trim().toLowerCase();
  if(!auth.rate('address:'+req.socket.remoteAddress)||!auth.rate(req.socket.remoteAddress+':'+username))return send(res,429,{error:'Too many attempts; retry in 15 minutes'});
  let user;
  if(u.pathname.endsWith('/setup')){
   if(auth.count())return send(res,409,{error:'Administrator account already exists'});
   const bootstrap=auth.identity({headers:{authorization:'Bearer '+String(b.bootstrapToken||'')}},token);if(!bootstrap)return send(res,401,{error:'Invalid setup token'});
   user=await auth.create({...b,role:'admin'});
   // Existing operator scans remain private to the first administrator.
   const rows=store.db.prepare('SELECT body FROM audits').all();for(const row of rows){const a=JSON.parse(row.body);if(!a.ownerId||a.ownerId==='legacy')store.save({...a,ownerId:user.id});}
  }else{
   user=store.db.prepare('SELECT * FROM users WHERE username=?').get(username);
   // Perform comparable password work even when the username is unknown.
   const valid=await auth.verify(b.password,user?.password||('131072:'+'0'.repeat(32)+':'+'0'.repeat(128)));if(!user||!valid)return send(res,401,{error:'Invalid username or password'});
  }
  const csrf=auth.session(user,res,secureCookies);return send(res,200,{user:auth.public(user),csrf});
 }
 const identity=auth.identity(req,token);if(!identity)return send(res,401,{error:'Sign in required'});
 if(['POST','PUT','PATCH','DELETE'].includes(req.method)&&!auth.mutation(req,identity))return send(res,403,{error:'Session verification failed; sign in again'});
 if(req.method==='GET'&&u.pathname==='/api/me')return send(res,200,{user:auth.public(identity.user),csrf:identity.session?.csrf||null});
 if(req.method==='POST'&&u.pathname==='/api/auth/logout'){auth.logout(identity,res,secureCookies);return send(res,200,{ok:true});}
 if(req.method==='PATCH'&&u.pathname==='/api/profile'){
  const b=await body(req);if(typeof b.name!=='string'||!b.name.trim()||b.name.length>100)throw new Error('Name must be 1–100 characters');store.db.prepare('UPDATE users SET name=? WHERE id=?').run(b.name.trim(),identity.user.id);return send(res,200,{ok:true});
 }
 if(req.method==='POST'&&u.pathname==='/api/profile/token'){
  const b=await body(req);if(!identity.user.password||!await auth.verify(b.password,identity.user.password))return send(res,401,{error:'Confirm your account password'});
  const value=b.generate===true?randomBytes(32).toString('hex'):b.token;auth.token(identity.user,value);return send(res,200,{token:value});
 }
 if(req.method==='POST'&&u.pathname==='/api/profile/password'){
  const b=await body(req);if(!await auth.verify(b.currentPassword,identity.user.password))return send(res,401,{error:'Current password is incorrect'});const encoded=await auth.password(b.password);store.db.prepare('UPDATE users SET password=? WHERE id=?').run(encoded,identity.user.id);store.db.prepare('DELETE FROM sessions WHERE user_id=?').run(identity.user.id);auth.logout(identity,res,secureCookies);return send(res,200,{ok:true});
 }
 if(u.pathname==='/api/customers'){
  if(!isAdmin(identity))return send(res,403,{error:'Administrator access required'});
  if(req.method==='GET')return send(res,200,{customers:store.db.prepare('SELECT * FROM users ORDER BY username').all().map(x=>auth.public(x))});
  if(req.method==='POST'){const b=await body(req);const user=await auth.create({...b,role:'customer'});return send(res,201,{user:auth.public(user)});}
 }
 if(!['GET','HEAD'].includes(req.method)&&u.pathname.startsWith('/api/audits')&&!isAdmin(identity))return send(res,403,{error:'Customer access is read-only'});

 if(req.method==='GET'&&u.pathname==='/api/audits')return send(res,200,{audits:visible(identity),allowedOrigins:isAdmin(identity)?origins:[],localTesting:isAdmin(identity)?localTesting:false});
 if(req.method==='DELETE'&&u.pathname==='/api/audits'){
  if(busy)return send(res,409,{error:'Wait for the running scan before clearing history'});
  const result=store.db.prepare('DELETE FROM audits').run();return send(res,200,{deleted:Number(result.changes)});
 }
 if(req.method==='POST'&&u.pathname==='/api/audits'){
  if(busy)return send(res,409,{error:'A scan is already running; retry when complete'});
  const b=await body(req);if(b.permissionConfirmed!==true)throw new Error('Confirm site-owner permission');
  let target=new URL(b.url);
  if(localTesting&&['127.0.0.1','[::1]'].includes(target.hostname))target.hostname='localhost';
  const url=parseTarget(target.href,origins,{localTesting}).href;
  const ownerId=b.ownerId||identity.user.id;if(ownerId!=='legacy'&&!store.db.prepare('SELECT id FROM users WHERE id=?').get(ownerId))throw new Error('Unknown scan owner');
  busy=true;const a=store.save({url,ownerId,state:'running',createdAt:new Date().toISOString()});send(res,202,a);
  scan(url,origins,{localTesting}).then(result=>store.save({...result,id:a.id,ownerId:a.ownerId,state:'complete'})).catch(e=>store.save({...a,state:'failed',error:e.message})).finally(()=>{busy=false;});return;
 }
 const match=u.pathname.match(/^\/api\/audits\/([a-f0-9-]+)(\/export)?$/);
 if(match){const a=store.get(match[1]);if(!canSee(identity,a))return send(res,404,{error:'Audit not found'});
  if(req.method==='GET')return send(res,200,a);
  if(req.method==='DELETE'){if(a.state==='running')throw new Error('Wait for the scan to finish before deleting');store.db.prepare('DELETE FROM audits WHERE id=?').run(a.id);return send(res,200,{deleted:true});}
  if(req.method==='PATCH'){
   const b=await body(req);
   if(b.ownerId){if(a.state==='running')throw new Error('Wait for the scan to finish');if(!store.db.prepare('SELECT id FROM users WHERE id=?').get(b.ownerId))throw new Error('Unknown owner');return send(res,200,store.save({...a,ownerId:b.ownerId}));}
   if(a.state!=='complete')throw new Error('Only completed audits can be reviewed');
   if(Number.isInteger(b.findingIndex)&&a.findings[b.findingIndex]){if(!['open','planned','fixed','dismissed'].includes(b.status))throw new Error('Invalid status');if(typeof b.note!=='string'||b.note.length>2000)throw new Error('Note required, maximum 2000 characters');if(['fixed','dismissed'].includes(b.status)&&!b.note.trim())throw new Error('Evidence or reason required');a.findings[b.findingIndex]={...a.findings[b.findingIndex],status:b.status,note:b.note};}
   else if(b.manual&&Object.keys(b.manual).length){for(const [k,v] of Object.entries(b.manual)){if(!(k in a.manual)||!['not-tested','pass','fail'].includes(v))throw new Error('Invalid manual check');a.manual[k]=v;}}
   else throw new Error('No valid review update');return send(res,200,store.save(a));
  }
 }
 if(req.method==='GET'&&u.pathname==='/api/compare'){const a=store.get(u.searchParams.get('before'));const b=store.get(u.searchParams.get('after'));if(!canSee(identity,a)||!canSee(identity,b)||a.state!=='complete'||b.state!=='complete')throw new Error('Select two completed audits');return send(res,200,compare(a,b));}
 send(res,404,{error:'Not found'});
 }catch(e){send(res,400,{error:e.code?.startsWith('SQLITE_CONSTRAINT')?'Username or token is already in use':e.message});}
});
server.listen(Number(process.env.PORT||8080),process.env.HOST||'0.0.0.0');
process.on('SIGTERM',()=>server.close(()=>{store.close();process.exit(0);}));
