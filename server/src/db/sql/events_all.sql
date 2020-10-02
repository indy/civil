select d.id as id,
       d.name as name,
       coalesce(p.exact_date, p.lower_date) as prime_date
from decks d, points p
where d.user_id = $1
      and d.kind = 'event'::deck_kind
      and p.deck_id = d.id
      and p.kind = 'point_prime'::point_kind
union
select d.id as id,
       d.name as name,
       null as prime_date
from decks d left join points p on p.deck_id = d.id
where d.user_id = $1
      and d.kind = 'event'::deck_kind
      and p.deck_id is null
order by prime_date;
