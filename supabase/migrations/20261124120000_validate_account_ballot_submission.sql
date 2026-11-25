-- Validate the account and poll before accepting a ballot and its optional comment.
create or replace function private.submit_ballot(p_poll_id uuid,p_voter_id uuid,p_token text,p_ranking jsonb,
  p_comment text,p_nickname text,p_avatar text) returns void
language plpgsql security definer set search_path='' as $$
declare target public.polls%rowtype;
begin
  if not private.is_account_voter(p_voter_id) then
    raise exception 'ACCOUNT_REQUIRED' using errcode='42501';
  end if;
  if coalesce(char_length(btrim(p_nickname)),0) not between 2 and 20
    or char_length(coalesce(p_comment,'')) > 200
    or p_avatar is null or char_length(p_avatar)>2048 then
    raise exception 'INVALID_COMMENT_PROFILE' using errcode='22023';
  end if;

  select * into target from public.polls where id=p_poll_id for update;
  if not found then raise exception 'POLL_NOT_FOUND' using errcode='22023'; end if;
  if target.owner_id=auth.uid() then
    raise exception 'POLL_OWNER_CANNOT_VOTE' using errcode='42501';
  end if;

  -- Validation and the vote upsert share one transaction and one parent-row lock.
  perform private.submit_vote(p_poll_id,p_voter_id,p_token,p_ranking);
  if nullif(btrim(p_comment),'') is null then
    delete from public.poll_comments where poll_id=p_poll_id and voter_id=p_voter_id;
  else
    insert into public.poll_comments(poll_id,voter_id,nickname,avatar,body,option_id)
      values(p_poll_id,p_voter_id,btrim(p_nickname),p_avatar,btrim(p_comment),(p_ranking->>0)::uuid)
    on conflict(poll_id,voter_id) do update set nickname=excluded.nickname,avatar=excluded.avatar,
      body=excluded.body,option_id=excluded.option_id,updated_at=clock_timestamp();
  end if;
end $$;

notify pgrst,'reload schema';
