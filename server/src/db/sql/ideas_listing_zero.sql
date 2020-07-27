select id, name, created_at
from decks
where id not in (select deck_id
                 from notes_decks
                 group by deck_id)
and kind = 'idea'
and user_id = $1
order by created_at desc;
