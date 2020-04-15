select d.id as id,
       d.name as name,
       coalesce(p.exact_date, p.lower_date) as birth_date
from decks d, points p
where d.user_id = $1
      and d.id = $2
      and d.kind = 'person'
      and p.deck_id = d.id
      and p.title = 'Birth';
