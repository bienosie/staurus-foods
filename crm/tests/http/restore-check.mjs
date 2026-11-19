// Disposable PostgreSQL only. No managed Supabase connection or real buyer data.
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import pg from 'pg';
import { checkEphemeralEnvironment, connectTestDatabase, users } from './prepare.mjs';

checkEphemeralEnvironment();
const source = await connectTestDatabase();
const restored = new pg.Client({database: 'sf_crm_restore'});
const schemas = ['auth', 'public', 'sf_private'];
const quote = value => '"' + value.replaceAll('"', '""') + '"';
const hash = value => createHash('sha256').update(JSON.stringify(value)).digest('hex');

async function snapshot(client) {
  const tables = (await client.query(`select n.nspname as schema, c.relname as name,
    c.relrowsecurity, c.relforcerowsecurity,
    array(select a::text from unnest(coalesce(c.relacl,acldefault('r',c.relowner))) a order by 1) as acl,
    pg_get_userbyid(c.relowner) as owner
    from pg_class c join pg_namespace n on n.oid=c.relnamespace
    where n.nspname=any($1) and c.relkind='r' order by 1,2`, [schemas])).rows;
  const rows = {};
  for (const table of tables) {
    const data = (await client.query(`select to_jsonb(t)::text as row from ${quote(table.schema)}.${quote(table.name)} t order by 1`)).rows;
    rows[`${table.schema}.${table.name}`] = {count: data.length, digest: hash(data)};
  }
  const policies = (await client.query(`select schemaname,tablename,policyname,permissive,roles,cmd,qual,with_check
    from pg_policies where schemaname=any($1) order by 1,2,3`, [schemas])).rows;
  const namespaces = (await client.query(`select nspname,
    array(select a::text from unnest(coalesce(nspacl,acldefault('n',nspowner))) a order by 1) as acl,
    pg_get_userbyid(nspowner) as owner
    from pg_namespace where nspname=any($1) order by 1`,[schemas])).rows;
  const indexes = (await client.query(`select schemaname,tablename,indexname,indexdef from pg_indexes
    where schemaname=any($1) order by 1,2,3`,[schemas])).rows;
  const sequences = (await client.query(`select schemaname,sequencename,sequenceowner,data_type,start_value,min_value,max_value,increment_by,cycle,cache_size,last_value
    from pg_sequences where schemaname=any($1) order by 1,2`,[schemas])).rows;
  const functions = (await client.query(`select n.nspname, p.proname, pg_get_function_identity_arguments(p.oid) as args,
    pg_get_functiondef(p.oid) as definition,
    array(select a::text from unnest(coalesce(p.proacl,acldefault('f',p.proowner))) a order by 1) as acl,
    pg_get_userbyid(p.proowner) as owner
    from pg_proc p join pg_namespace n on n.oid=p.pronamespace
    where n.nspname=any($1) and p.prokind='f' order by 1,2,3`, [schemas])).rows;
  const constraints = (await client.query(`select n.nspname,c.relname,k.conname,pg_get_constraintdef(k.oid) as definition
    from pg_constraint k join pg_class c on c.oid=k.conrelid join pg_namespace n on n.oid=c.relnamespace
    where n.nspname=any($1) order by 1,2,3`, [schemas])).rows;
  const triggers = (await client.query(`select n.nspname,c.relname,t.tgname,pg_get_triggerdef(t.oid) as definition
    from pg_trigger t join pg_class c on c.oid=t.tgrelid join pg_namespace n on n.oid=c.relnamespace
    where n.nspname=any($1) and not t.tgisinternal order by 1,2,3`, [schemas])).rows;
  return {tables, rows, policies, namespaces, indexes, sequences, functions, constraints, triggers};
}

async function asUser(user, operation) {
  await restored.query('begin');
  try {
    await restored.query('set local role authenticated');
    await restored.query("select set_config('request.jwt.claims',$1,true)", [JSON.stringify({role:'authenticated',sub:user})]);
    return await operation();
  } finally { await restored.query('rollback'); }
}

try {
  await restored.connect();
  const before = await snapshot(source);
  const copy = await snapshot(restored);
  assert.deepEqual(copy, before, 'Restored rows and database access controls must match');
  assert.equal(copy.tables.length, 10, 'Expected six business tables, three private tables and synthetic auth users');
  for (const name of ['sf_organisations','sf_contacts','sf_enquiries','sf_samples','sf_quotes','sf_activities']) {
    assert.ok(copy.rows['public.'+name].count > 0, 'Restore must test populated tables');
    assert.equal(copy.tables.find(t=>t.name===name).relrowsecurity, true);
  }
  assert.ok(copy.rows['sf_private.intake_requests'].count > 0);
  assert.ok(copy.rows['sf_private.audit_events'].count > 0);
  await asUser(users.viewer, async()=>{
    assert.equal((await restored.query('select count(*)::int n from public.sf_enquiries')).rows[0].n, copy.rows['public.sf_enquiries'].count);
    await assert.rejects(restored.query("insert into public.sf_samples(enquiry_id,lot_id,cost,currency) select id,'RESTORE-DENIED',0,'GBP' from public.sf_enquiries limit 1"), {code:'42501'});
  });
  for (const user of [users.outsider,users.editor]) {
    await asUser(user, async()=>{
      assert.equal((await restored.query('select count(*)::int n from public.sf_enquiries')).rows[0].n, 0);
      assert.equal((await restored.query('select public.sf_access_role() as role')).rows[0].role, null);
    });
  }
  // Reactivation is confined to a rolled-back transaction on the disposable copy.
  await restored.query('begin');
  try {
    await restored.query('update sf_private.staff set active=true where user_id=$1',[users.editor]);
    await restored.query('set local role authenticated');
    await restored.query("select set_config('request.jwt.claims',$1,true)",[JSON.stringify({role:'authenticated',sub:users.editor})]);
    const enquiry=(await restored.query('select id,version from public.sf_enquiries order by id limit 1')).rows[0];
    await restored.query("select public.sf_progress_enquiry($1,$2,'specification_requested','RESTORE REHEARSAL ONLY',null)",[enquiry.id,enquiry.version]);
    const updated=(await restored.query('select status,version from public.sf_enquiries where id=$1',[enquiry.id])).rows[0];
    assert.equal(updated.status,'specification_requested');
    assert.equal(updated.version,enquiry.version+1);
    assert.equal((await restored.query("select count(*)::int n from public.sf_activities where enquiry_id=$1 and notes='RESTORE REHEARSAL ONLY'",[enquiry.id])).rows[0].n,1);
    await assert.rejects(restored.query("select public.sf_progress_enquiry($1,$2,'won','Stale recovery test',null)",[enquiry.id,enquiry.version]),{code:'40001'});
  } finally { await restored.query('rollback'); }
  // PostgreSQL sequence allocations survive rollback. Rows and controls must match;
  // the audit sequence may advance on the disposable copy, and must never rewind.
  const after = await snapshot(restored);
  assert.deepEqual({...after,sequences:undefined},{...copy,sequences:undefined},'Rehearsal rows and controls must roll back');
  assert.equal(after.sequences.length,copy.sequences.length);
  for (let i=0;i<copy.sequences.length;i++) {
    assert.deepEqual({...after.sequences[i],last_value:undefined},{...copy.sequences[i],last_value:undefined});
    assert.ok(BigInt(after.sequences[i].last_value)>=BigInt(copy.sequences[i].last_value));
  }
  assert.deepEqual(await snapshot(source),before,'Source database must remain unchanged');
  console.log(JSON.stringify({passed:true,scope:'disposable PostgreSQL 17 backup/restore',tables:copy.tables.length,
    exact_data_and_controls:true,viewer_read_and_write_denial:true,outsider_denied:true,revocation_preserved:true,
    progress_and_stale_write_checks:true,rehearsal_rolled_back:true,source_unchanged:true,
    not_tested:['Managed Supabase backup','Supabase Auth recovery','Global roles on a new cluster','Storage objects','Inbox delivery']},null,2));
} finally { await source.end(); await restored.end(); }
