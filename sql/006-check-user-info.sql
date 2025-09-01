with u as (
  select p.user_id, p.display_name, p.avatar_url
  from public.profiles p
  where p.display_name != 'test-user'
)
select
  u.display_name        as user_name,
  -- u.avatar_url          as user_avatar,

  -- r.record_id,
  r.title               as record_title,
  -- 不返回 r.form_type，改为映射后的名称
  coalesce(uft.type_name, r.form_type) as form_type_name,
  r.body_md,
  r.occurred_at,
  r.duration_min,
  r.effective_duration_min,
  r.mood,
  r.difficulty,
  r.focus,
  r.energy,
  r.privacy,
  r.assets,

  (
    select coalesce(jsonb_agg(t.tag_name order by t.tag_name), '[]'::jsonb)
    from public.resource_tags rt
    join public.tags t on t.tag_id = rt.tag_id
    where rt.user_id = u.user_id
      and rt.resource_id = r.resource_id
  ) as tag_names,

  res.title             as resource_title,
  res.type              as resource_type,
  res.author            as resource_author,
  res.url               as resource_url,
  res.platform          as resource_platform,
  res.isbn              as resource_isbn,
  res.description       as resource_description,

  ur.status             as user_resource_status,
  ur.rating             as user_resource_rating,
  ur.review_short       as user_resource_review_short,
  ur.total_duration_min as user_resource_total_duration_min,
  ur.is_favorite        as user_resource_is_favorite,
  ur.last_interaction_at as user_resource_last_interaction_at

from public.records r
join u on u.user_id = r.user_id
left join public.user_form_types uft
  on uft.user_id = u.user_id
 and uft.type_code = r.form_type
left join public.resources res
  on res.resource_id = r.resource_id
left join public.user_resources ur
  on ur.user_id = r.user_id
 and ur.resource_id = r.resource_id
order by r.occurred_at desc;