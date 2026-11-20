begin;
create temporary table image_test_state as select gen_random_uuid() as owner_a,gen_random_uuid() as owner_b;
grant select on image_test_state to anon,authenticated;
set local role anon;
do $$ begin
  begin insert into storage.objects(bucket_id,name) values('poll-images','anonymous/test.webp');
    raise exception 'Anonymous upload allowed'; exception when insufficient_privilege then null; end;
end $$;
reset role;
select set_config('request.jwt.claims',jsonb_build_object('sub',owner_a,'role','authenticated','is_anonymous',false)::text,true) from image_test_state;
set local role authenticated;
insert into storage.objects(bucket_id,name) select 'poll-images',owner_a::text||'/test.webp' from pg_temp.image_test_state;
do $$ declare s record; begin
  select * into s from pg_temp.image_test_state;
  assert (select count(*) from storage.objects where bucket_id='poll-images' and name=s.owner_a::text||'/test.webp')=1;
  begin insert into storage.objects(bucket_id,name) values('poll-images',s.owner_b::text||'/test.webp');
    raise exception 'Other folder upload allowed'; exception when insufficient_privilege then null; end;
end $$;
reset role;
select set_config('request.jwt.claims',jsonb_build_object('sub',owner_b,'role','authenticated','is_anonymous',false)::text,true) from image_test_state;
set local role authenticated;
do $$ begin
  begin delete from storage.objects where bucket_id='poll-images' and name=(select owner_a::text||'/test.webp' from pg_temp.image_test_state);
  exception when insufficient_privilege then null; end;
end $$;
reset role;
do $$ begin
  assert exists(select 1 from storage.objects where bucket_id='poll-images' and name=(select owner_a::text||'/test.webp' from image_test_state));
end $$;
select set_config('request.jwt.claims',jsonb_build_object('sub',owner_b,'role','authenticated','is_anonymous',true)::text,true) from image_test_state;
set local role authenticated;
do $$ begin
  begin insert into storage.objects(bucket_id,name) select 'poll-images',owner_b::text||'/anonymous.webp' from pg_temp.image_test_state;
    raise exception 'Anonymous Auth upload allowed'; exception when insufficient_privilege then null; end;
end $$;
reset role;
select jsonb_build_object('passed',array['anonymous_upload_denied','account_own_folder_upload','other_folder_upload_denied','other_account_delete_denied','anonymous_auth_denied']) as verification;
rollback;
