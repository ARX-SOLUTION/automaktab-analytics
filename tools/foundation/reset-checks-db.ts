import {sql} from 'drizzle-orm';
import {createFoundationApplication} from '../../apps/api/src/application/index.js';

/** Destructive reset of the disposable Docker checks database only. Never touches persistent stack data. */
export async function resetChecksDatabase(){
 const url=process.env.DATABASE_URL;if(!url)throw new Error('CONFIG_INVALID');
 const host=new URL(url).hostname;if(host!=='checks-db')throw new Error('RESET_REQUIRES_DISPOSABLE_CHECKS_DB');
 if(process.env.APP_ENV!=='synthetic')throw new Error('RESET_REQUIRES_SYNTHETIC');
 const app=createFoundationApplication(process.env);
 try{
  await app.database.db.execute(sql`DROP SCHEMA IF EXISTS public CASCADE`);
  await app.database.db.execute(sql`CREATE SCHEMA public`);
  console.log('PASS disposable checks database reset to an empty schema');
 }finally{await app.close();}
}
if(process.argv[1]?.endsWith('/reset-checks-db.js'))await resetChecksDatabase();
