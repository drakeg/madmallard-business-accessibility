import {randomBytes,randomUUID,scrypt as scryptCallback,createHash,timingSafeEqual} from 'node:crypto';
import {promisify} from 'node:util';
import {one,execute} from './cloud-db.js';
const scrypt=promisify(scryptCallback);
const hash=value=>createHash('sha256').update(value).digest('hex');
const safe=(a,b)=>typeof a==='string'&&typeof b==='string'&&a.length===b.length&&timingSafeEqual(Buffer.from(a),Buffer.from(b));
export const publicUser=user=>({id:user.id,username:user.username,name:user.name,role:user.role,hasToken:!!user.token_hash});
export async function encodePassword(value){
 if(typeof value!=='string'||value.length<12||value.length>128)throw new Error('Use a password from 12 to 128 characters');
 const salt=randomBytes(16).toString('hex');const key=await scrypt(value,salt,64,{N:131072,r:8,p:1,maxmem:256*1024*1024});return '131072:'+salt+':'+key.toString('hex');
}
export async function verifyPassword(value,stored){
 if(typeof value!=='string'||value.length>128)return false;
 const parts=String(stored||'').split(':');const [cost,salt,expected]=parts.length===3?parts:['16384',...parts];
 if(!['16384','131072'].includes(cost))return false;
 const key=await scrypt(value,salt,64,{N:Number(cost),r:8,p:1,maxmem:256*1024*1024});return safe(key.toString('hex'),expected);
}
export async function createUser(db,{username,name,password,role='customer'},onlyFirst=false){
 username=String(username||'').trim().toLowerCase();if(!/^[a-z0-9@._+-]{3,80}$/.test(username))throw new Error('Username must be 3–80 letters, numbers or @ . _ + -');
 name=String(name||username).trim();if(!name||name.length>100)throw new Error('Name must be 1–100 characters');
 const encoded=await encodePassword(password),id=randomUUID();
 const sql=onlyFirst?'INSERT INTO users(id,username,name,password,role) SELECT ?,?,?,?,? WHERE NOT EXISTS (SELECT 1 FROM users)':'INSERT INTO users(id,username,name,password,role) VALUES (?,?,?,?,?)';
 const result=await execute(db,sql,[id,username,name,encoded,role]);if(!Number(result.rowsAffected))throw Object.assign(new Error('Administrator account already exists'),{status:409});
 return one(db,'SELECT * FROM users WHERE id=?',[id]);
}
export async function rate(db,key){
 const now=Date.now();await execute(db,'DELETE FROM login_attempts WHERE until<?',[now]);
 const result=await one(db,'SELECT count FROM login_attempts WHERE key=?',[key]);if(result&&Number(result.count)>=10)return false;
 await execute(db,'INSERT INTO login_attempts(key,count,until) VALUES (?,1,?) ON CONFLICT(key) DO UPDATE SET count=count+1,until=excluded.until',[key,now+15*60*1000]);return true;
}
export async function identity(db,req){
 const bearer=String(req.headers.authorization||'').match(/^Bearer (.+)$/)?.[1];
 if(bearer){const user=await one(db,'SELECT * FROM users WHERE token_hash=?',[hash(bearer)]);return user?{user,kind:'bearer'}:null;}
 const raw=String(req.headers.cookie||'').split(';').map(s=>s.trim()).find(s=>s.startsWith('mm_session='))?.slice(11);
 if(!raw)return null;
 const session=await one(db,'SELECT * FROM sessions WHERE hash=? AND expires>?',[hash(raw),Date.now()]);
 if(!session)return null;
 const user=await one(db,'SELECT * FROM users WHERE id=?',[session.user_id]);return user?{user,kind:'session',session}:null;
}
export async function createSession(db,user,res){
 const raw=randomBytes(32).toString('hex'),csrf=randomBytes(24).toString('hex');
 await execute(db,'DELETE FROM sessions WHERE expires<?',[Date.now()]);
 await execute(db,'INSERT INTO sessions(hash,user_id,csrf,expires) VALUES (?,?,?,?)',[hash(raw),user.id,csrf,Date.now()+8*60*60*1000]);
 res.setHeader('Set-Cookie',`mm_session=${raw}; HttpOnly; SameSite=Strict; Secure; Path=/; Max-Age=28800`);return csrf;
}
export async function logout(db,session,res){if(session)await execute(db,'DELETE FROM sessions WHERE hash=?',[session.hash]);res.setHeader('Set-Cookie','mm_session=; HttpOnly; SameSite=Strict; Secure; Path=/; Max-Age=0');}
export async function setToken(db,userId,value){
 if(typeof value!=='string'||value.length<32||value.length>256||!/^[A-Za-z0-9_-]+$/.test(value))throw new Error('Token must contain 32–256 letters, numbers, hyphens or underscores');
 await execute(db,'UPDATE users SET token_hash=? WHERE id=?',[hash(value),userId]);
}
export function verifyBootstrap(value){const secret=process.env.ADMIN_SETUP_TOKEN;if(!secret||secret.length<32)return false;return safe(String(value||''),secret);}
export function verifyCsrf(req,account){return account.kind!=='session'||safe(String(req.headers['x-csrf-token']||''),account.session.csrf);}
export const generateToken=()=>randomBytes(32).toString('hex');
