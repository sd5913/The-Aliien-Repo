// PGLITE_MODULE points to a temporary @electric-sql/pglite installation.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
const { PGlite } = await import(pathToFileURL(process.env.PGLITE_MODULE).href);
const db = new PGlite();
await db.exec(`
  create role anon; create role authenticated; create role service_role bypassrls;
  create schema storage;
  grant usage on schema public, storage to anon, authenticated, service_role;
  create table storage.buckets(id text primary key, name text, public boolean,
    file_size_limit bigint, allowed_mime_types text[]);
  create table storage.objects(id uuid default gen_random_uuid(), bucket_id text, name text);
  alter table storage.objects enable row level security;
  grant all on storage.objects to anon, authenticated;
`);
await db.exec(readFileSync('supabase/migrations/20261126130816_user_feedback.sql', 'utf8'));
const path = '10000000-0000-4000-8000-000000000001/screenshot.png';
const insert = `insert into public.user_feedback(page,title,body,contact,screenshot_path,locale,app_version)
  values ('投票结果', '头像显示错误', '上传头像显示为链接', null, '${path}', 'zh-CN', '1.5.0')`;
const denied = async (sql, code = '42501') => {
  await assert.rejects(db.exec(sql), error => error.code === code);
};
for (const role of ['anon', 'authenticated']) {
  await db.exec(`set role ${role}`);
  await db.exec(insert);
  await db.exec(`insert into storage.objects(bucket_id,name) values ('feedback-screenshots','${path}')`);
  await denied('select * from public.user_feedback');
  await denied("update public.user_feedback set contact='stolen'");
  await denied('delete from public.user_feedback');
  await denied(`insert into public.user_feedback(id,page,title,body,locale,app_version)
    values(gen_random_uuid(),'p','t','b','en-US','1')`);
  await denied(`insert into public.user_feedback(page,title,body,locale,app_version,created_at)
    values('p','t','b','en-US','1',now())`);
  await denied(`insert into public.user_feedback(page,title,body,locale,app_version)
    values('p','   ','b','en-US','1')`, '23514');
  await denied(`insert into public.user_feedback(page,title,body,contact,locale,app_version)
    values('p','t','b',repeat('a',201),'en-US','1')`, '23514');
  await denied(`insert into public.user_feedback(page,title,body,locale,app_version)
    values('p','t',repeat('a',3001),'en-US','1')`, '23514');
  await denied(`insert into public.user_feedback(page,title,body,screenshot_path,locale,app_version)
    values('p','t','b','https://public.invalid/leak','en-US','1')`, '23514');
  await denied(`insert into storage.objects(bucket_id,name) values ('poll-images','${path}')`);
  await denied("insert into storage.objects(bucket_id,name) values ('feedback-screenshots','script.svg')");
  assert.equal((await db.query('select * from storage.objects')).rows.length, 0);
  await db.exec("update storage.objects set name='tampered'; delete from storage.objects;");
  await db.exec('reset role');
}
await db.exec('set role service_role');
const feedback = (await db.query('select * from public.user_feedback')).rows;
assert.equal(feedback.length, 2);
assert.equal(feedback[0].contact, null);
assert.equal(feedback[0].screenshot_path, path);
assert.ok(feedback[0].created_at);
await db.exec('reset role');
assert.equal((await db.query('select * from storage.objects')).rows.length, 2);
const bucket = (await db.query("select * from storage.buckets where id='feedback-screenshots'")).rows[0];
assert.equal(bucket.public, false);
assert.equal(bucket.file_size_limit, 5 * 1024 * 1024);
assert.deepEqual(bucket.allowed_mime_types, ['image/jpeg', 'image/png', 'image/webp']);
await db.close();
console.log('Passed: guest/account feedback inserts, field constraints, private screenshots, no client read/update/delete, operator access.');
