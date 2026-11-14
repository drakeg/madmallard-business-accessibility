import {DatabaseSync} from 'node:sqlite';
import {mkdirSync} from 'node:fs';
import {dirname} from 'node:path';
import {randomUUID} from 'node:crypto';
export class Store {
 constructor(path){mkdirSync(dirname(path),{recursive:true});this.db=new DatabaseSync(path);this.db.exec('PRAGMA journal_mode=WAL; CREATE TABLE IF NOT EXISTS audits (id TEXT PRIMARY KEY, body TEXT NOT NULL)');}
 save(a){a={...a,id:a.id??randomUUID()};this.db.prepare('INSERT OR REPLACE INTO audits VALUES (?,?)').run(a.id,JSON.stringify(a));return a;}
 get(id){const row=this.db.prepare('SELECT body FROM audits WHERE id=?').get(id);return row?JSON.parse(row.body):null;}
 list(){return this.db.prepare('SELECT body FROM audits ORDER BY rowid DESC LIMIT 100').all().map(x=>JSON.parse(x.body));}
 close(){this.db.close();}
}
