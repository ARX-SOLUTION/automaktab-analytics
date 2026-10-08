import {sql} from 'drizzle-orm';
import {check,integer,pgTable,text} from 'drizzle-orm/pg-core';
export const foundationVersion=pgTable('foundation_version',{id:integer('id').primaryKey(),version:integer('version').notNull()},table=>[check('foundation_version_id_check',sql`${table.id}=1`)]);
export const foundationProbe=pgTable('foundation_probe',{id:text('id').primaryKey()});
