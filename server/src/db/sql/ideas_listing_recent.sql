select id, name
from decks
where user_id = $1 and kind = 'idea'
order by created_at desc
limit 20;
