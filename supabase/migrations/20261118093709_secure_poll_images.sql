insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('poll-images','poll-images',true,5242880,array['image/jpeg','image/png','image/webp'])
on conflict(id) do update set public=true,file_size_limit=excluded.file_size_limit,allowed_mime_types=excluded.allowed_mime_types;

create policy "account uploads own poll images" on storage.objects for insert to authenticated
with check(bucket_id='poll-images' and (storage.foldername(name))[1]=(select auth.uid())::text
  and not coalesce(((select auth.jwt())->>'is_anonymous')::boolean,false));
create policy "account lists own poll images" on storage.objects for select to authenticated
using(bucket_id='poll-images' and (storage.foldername(name))[1]=(select auth.uid())::text
  and not coalesce(((select auth.jwt())->>'is_anonymous')::boolean,false));
create policy "account removes own poll images" on storage.objects for delete to authenticated
using(bucket_id='poll-images' and (storage.foldername(name))[1]=(select auth.uid())::text
  and not coalesce(((select auth.jwt())->>'is_anonymous')::boolean,false));
-- Bucket downloads are public so soft-login participants can see product images.
-- No UPDATE/upsert policy: published URLs are immutable and safe to reuse in copies.
