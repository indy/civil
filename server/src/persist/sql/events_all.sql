select d.id as id,
       d.name as name,
       coalesce(p.exact_date, p.lower_date) as sort_date
from decks d, points p
where d.user_id = $1
      and d.kind = 'event'
      and p.deck_id = d.id
      and p.title = 'Event'
order by sort_date;
