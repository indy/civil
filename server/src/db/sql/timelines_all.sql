select id, name
from decks
where user_id = $1 and kind = 'timeline'::deck_kind
order by created_at desc;
