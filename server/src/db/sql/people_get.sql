select d.id as id,
       d.name as name
from decks d
where d.user_id = $1
      and d.id = $2
      and d.kind = 'person'
