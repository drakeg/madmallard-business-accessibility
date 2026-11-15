import {createClient} from '@libsql/client';
import postgres from 'postgres';

let initialized;
export function configured(){return Boolean(process.env.POSTGRES_URL||process.env.DATABASE_URL||process.env.TURSO_DATABASE_URL||process.env.LIBSQL_URL);}
export function database(){
 if(!configured())throw Object.assign(new Error('Persistent database is not connected. Configure a managed Postgres or Turso database in Vercel Storage.'),{status:503});
 initialized??=(async()=>{
  const pgUrl=process.env.POSTGRES_URL||process.env.DATABASE_URL;
  const db=pgUrl?await postgresAdapter(pgUrl):createClient({url:process.env.TURSO_DATABASE_URL||process.env.LIBSQL_URL,authToken:process.env.TURSO_AUTH_TOKEN||process.env.LIBSQL_AUTH_TOKEN});
  for(const sql of [
   'CREATE TABLE IF NOT EXISTS users (id TEXT PRIMARY KEY,username TEXT UNIQUE NOT NULL,name TEXT NOT NULL,password TEXT NOT NULL,role TEXT NOT NULL,token_hash TEXT)',
   'CREATE UNIQUE INDEX IF NOT EXISTS users_token_hash ON users(token_hash) WHERE token_hash IS NOT NULL',
   "CREATE UNIQUE INDEX IF NOT EXISTS one_admin_account ON users(role) WHERE role='admin'",
   'CREATE TABLE IF NOT EXISTS sessions (hash TEXT PRIMARY KEY,user_id TEXT NOT NULL,csrf TEXT NOT NULL,expires BIGINT NOT NULL)',
   'CREATE TABLE IF NOT EXISTS login_attempts (key TEXT PRIMARY KEY,count INTEGER NOT NULL,until BIGINT NOT NULL)',
   'CREATE TABLE IF NOT EXISTS audits (id TEXT PRIMARY KEY,body TEXT NOT NULL)',
   'CREATE TABLE IF NOT EXISTS scan_lease (id INTEGER PRIMARY KEY CHECK (id=1),audit_id TEXT NOT NULL,expires BIGINT NOT NULL)'
  ])await db.execute(sql);
  return db;
 })().catch(error=>{initialized=null;throw error;});
 return initialized;
}
export const one=async(db,sql,args=[])=>{const result=await db.execute({sql,args});return result.rows[0]||null;};
export const all=async(db,sql,args=[])=>(await db.execute({sql,args})).rows;
export const execute=async(db,sql,args=[])=>db.execute({sql,args});

async function postgresAdapter(url){
 const sql=postgres(url,{ssl:'require',max:2,prepare:false,idle_timeout:20,connect_timeout:10});
 // Keep passwords and audit data in a schema that is not exposed by Supabase's public Data API.
 await sql.unsafe('CREATE SCHEMA IF NOT EXISTS mm_audit');
 const normalize=statement=>statement.replace(/\b(users|sessions|login_attempts|audits|scan_lease)\b/g,'mm_audit.$1').replace(/json_extract\(body,'\$\.ownerId'\)/g,"(body::jsonb->>'ownerId')").replace(/ORDER BY rowid DESC/g,"ORDER BY (body::jsonb->>'createdAt') DESC");
 return {execute:async({sql:statement,args=[]})=>{
  let counter=0;const translated=normalize(statement).replace(/\?/g,()=>'$'+(++counter));
  const rows=await sql.unsafe(translated,args);
  return {rows,rowsAffected:Number(rows.count||0)};
 }};
}
