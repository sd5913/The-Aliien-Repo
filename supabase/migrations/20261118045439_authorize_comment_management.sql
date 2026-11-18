-- Comment changes are independent of ballots, including after the poll closes.
-- Parent-row locking uses the same order as ballot submission and poll deletion.
create function private.update_comment(p_comment_id uuid,p_voter_id uuid,p_token text,p_body text) returns void
language plpgsql security definer set search_path='' as $$
declare target_poll uuid; target public.poll_comments%rowtype;
begin
  if p_token is null or p_token !~ '^[a-f0-9]{64}$' or not exists(select 1 from private.soft_participants
    where id=p_voter_id and token_hash=encode(extensions.digest(p_token,'sha256'),'hex')) then
    raise exception 'PARTICIPANT_REQUIRED' using errcode='42501'; end if;
  if coalesce(char_length(btrim(p_body)),0) not between 1 and 200 then
    raise exception 'INVALID_COMMENT' using errcode='22023'; end if;
  select poll_id into target_poll from public.poll_comments where id=p_comment_id;
  if not found then raise exception 'COMMENT_NOT_FOUND' using errcode='22023'; end if;
  perform 1 from public.polls where id=target_poll for update;
  select * into target from public.poll_comments where id=p_comment_id for update;
  if not found or target.voter_id is distinct from p_voter_id then
    raise exception 'NOT_COMMENT_AUTHOR' using errcode='42501'; end if;
  update public.poll_comments set body=btrim(p_body),updated_at=clock_timestamp() where id=p_comment_id;
end $$;

create function private.delete_comment(p_comment_id uuid,p_voter_id uuid,p_token text) returns void
language plpgsql security definer set search_path='' as $$
declare target_poll uuid; target public.poll_comments%rowtype; owner uuid; actor uuid:=auth.uid(); account_owner boolean;
begin
  select poll_id into target_poll from public.poll_comments where id=p_comment_id;
  if not found then raise exception 'COMMENT_NOT_FOUND' using errcode='22023'; end if;
  select owner_id into owner from public.polls where id=target_poll for update;
  select * into target from public.poll_comments where id=p_comment_id for update;
  if not found then raise exception 'COMMENT_NOT_FOUND' using errcode='22023'; end if;
  account_owner := actor is not null and owner=actor and exists(select 1 from auth.users where id=actor and not is_anonymous);
  if not coalesce(account_owner,false) and not coalesce((
    target.voter_id=p_voter_id and p_token is not null and p_token ~ '^[a-f0-9]{64}$' and exists(
      select 1 from private.soft_participants where id=p_voter_id
      and token_hash=encode(extensions.digest(p_token,'sha256'),'hex'))
  ),false) then raise exception 'COMMENT_DELETE_FORBIDDEN' using errcode='42501'; end if;
  delete from public.poll_comments where id=p_comment_id;
end $$;

create function public.update_comment(p_comment_id uuid,p_voter_id uuid,p_token text,p_body text) returns void
language sql security invoker set search_path='' as $$ select private.update_comment(p_comment_id,p_voter_id,p_token,p_body) $$;
create function public.delete_comment(p_comment_id uuid,p_voter_id uuid,p_token text) returns void
language sql security invoker set search_path='' as $$ select private.delete_comment(p_comment_id,p_voter_id,p_token) $$;
revoke all on function private.update_comment(uuid,uuid,text,text),public.update_comment(uuid,uuid,text,text),
  private.delete_comment(uuid,uuid,text),public.delete_comment(uuid,uuid,text) from public,anon,authenticated;
grant execute on function private.update_comment(uuid,uuid,text,text),public.update_comment(uuid,uuid,text,text),
  private.delete_comment(uuid,uuid,text),public.delete_comment(uuid,uuid,text) to anon,authenticated;
notify pgrst,'reload schema';
