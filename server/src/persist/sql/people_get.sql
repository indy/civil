select d.id as id,
       d.name as name,
       coalesce(p.exact_date, p.lower_date) as birth_date
from decks d, decks_points dp, points p
where d.user_id = $1
      and d.id = $2
      and d.kind = 'person'
      and dp.deck_id = d.id
      and dp.point_id = p.id
      and p.title = 'Birth';
