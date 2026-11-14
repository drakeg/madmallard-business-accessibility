import http from 'node:http';
import {readFile} from 'node:fs/promises';
import {timingSafeEqual} from 'node:crypto';
import {Store} from './store.js';
import {scan} from './scanner.js';
import {compare,parseTarget} from './policy.js';
const token=process.env.API_TOKEN;
if(!token||token.length<32) throw new Error('Set API_TOKEN to at least 32 characters');
const localTesting=process.env.LOCAL_TESTING==='true';
const origins=(process.env.ALLOWED_ORIGINS||'').split(',').map(x=>x.trim()).filter(Boolean);
for(const origin of origins) if(new URL(origin).origin!==origin) throw new Error('ALLOWED_ORIGINS must contain exact URL origins');
const store=new Store(process.env.DB_PATH||'data/audits.sqlite');
// A crashed job is never reported as successful on restart.
for(const a of store.list()) if(a.state==='running') store.save({...a,state:'failed',error:'Process restarted during scan; rerun after review'});
let busy=false;
const send=(res,status,body)=>{res.writeHead(status,{'Content-Type':'application/json','Cache-Control':'no-store'});res.end(JSON.stringify(body));};
async function body(req){let s='';for await(const c of req){s+=c;if(Buffer.byteLength(s)>32768)throw new Error('Request too large');}return JSON.parse(s||'{}');}
function authorized(req){const v=req.headers.authorization||'';const expected=`Bearer ${token}`;return Buffer.byteLength(v)===Buffer.byteLength(expected)&&timingSafeEqual(Buffer.from(v),Buffer.from(expected));}
const server=http.createServer(async(req,res)=>{
 res.setHeader('X-Content-Type-Options','nosniff');res.setHeader('Referrer-Policy','no-referrer');res.setHeader('Content-Security-Policy',"default-src 'self'; script-src 'self'; style-src 'self'; connect-src 'self'; frame-ancestors 'none'");
 try {
 const u=new URL(req.url,'http://localhost');
 if(req.method==='GET'&&u.pathname==='/healthz')return send(res,200,{status:'ok'});
 const files={'/':'index.html','/app.js':'app.js','/style.css':'style.css','/third-party-notices':'third-party-notices.txt'};
 if(req.method==='GET'&&files[u.pathname]){res.writeHead(200,{'Content-Type':u.pathname.endsWith('.js')?'text/javascript':u.pathname.endsWith('.css')?'text/css':u.pathname==='/third-party-notices'?'text/plain; charset=utf-8':'text/html','Cache-Control':'no-store'});return res.end(await readFile(new URL('../public/'+files[u.pathname],import.meta.url)));}
 if(!authorized(req))return send(res,401,{error:'Authentication required'});
 if(req.method==='GET'&&u.pathname==='/api/audits')return send(res,200,{audits:store.list(),allowedOrigins:origins,localTesting});
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
  busy=true;const a=store.save({url,state:'running',createdAt:new Date().toISOString()});send(res,202,a);
  scan(url,origins,{localTesting}).then(result=>store.save({...result,id:a.id,state:'complete'})).catch(e=>store.save({...a,state:'failed',error:e.message})).finally(()=>{busy=false;});return;
 }
 const match=u.pathname.match(/^\/api\/audits\/([a-f0-9-]+)(\/export)?$/);
 if(match){const a=store.get(match[1]);if(!a)return send(res,404,{error:'Audit not found'});
  if(req.method==='GET')return send(res,200,a);
  if(req.method==='DELETE'){if(a.state==='running')throw new Error('Wait for the scan to finish before deleting');store.db.prepare('DELETE FROM audits WHERE id=?').run(a.id);return send(res,200,{deleted:true});}
  if(req.method==='PATCH'){
   if(a.state!=='complete')throw new Error('Only completed audits can be reviewed');const b=await body(req);
   if(Number.isInteger(b.findingIndex)&&a.findings[b.findingIndex]){if(!['open','planned','fixed','dismissed'].includes(b.status))throw new Error('Invalid status');if(typeof b.note!=='string'||b.note.length>2000)throw new Error('Note required, maximum 2000 characters');if(['fixed','dismissed'].includes(b.status)&&!b.note.trim())throw new Error('Evidence or reason required');a.findings[b.findingIndex]={...a.findings[b.findingIndex],status:b.status,note:b.note};}
   else if(b.manual&&Object.keys(b.manual).length){for(const [k,v] of Object.entries(b.manual)){if(!(k in a.manual)||!['not-tested','pass','fail'].includes(v))throw new Error('Invalid manual check');a.manual[k]=v;}}
   else throw new Error('No valid review update');return send(res,200,store.save(a));
  }
 }
 if(req.method==='GET'&&u.pathname==='/api/compare'){const a=store.get(u.searchParams.get('before'));const b=store.get(u.searchParams.get('after'));if(!a||!b||a.state!=='complete'||b.state!=='complete')throw new Error('Select two completed audits');return send(res,200,compare(a,b));}
 send(res,404,{error:'Not found'});
 }catch(e){send(res,400,{error:e.message});}
});
server.listen(Number(process.env.PORT||8080),process.env.HOST||'0.0.0.0');
process.on('SIGTERM',()=>server.close(()=>{store.close();process.exit(0);}));
