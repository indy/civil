select id, name, created_at, idea_category
from decks
where id not in (select deck_id
                 from notes_decks
                 group by deck_id)
and id not in (select n.deck_id
               from notes n inner join notes_decks nd on n.id = nd.note_id
               group by n.deck_id)
and kind = 'idea'
and user_id = $1
order by created_at desc;
