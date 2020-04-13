select d.id as id,
       d.name as name,
       coalesce(p.exact_date, p.lower_date) as sort_date
from decks d, decks_points dp, points p
where d.user_id = $1
      and d.kind = 'event'
      and dp.deck_id = d.id
      and dp.point_id = p.id
      and p.title = 'Event'
order by sort_date;
