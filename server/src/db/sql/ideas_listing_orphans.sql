select d.id, d.name, d.created_at, ie.idea_category
from decks d left join idea_extras ie on ie.deck_id=d.id
where d.id not in (select deck_id
                   from notes_decks
                   group by deck_id)
and d.id not in (select n.deck_id
                 from notes n inner join notes_decks nd on n.id = nd.note_id
                 group by n.deck_id)
and d.kind = 'idea'
and d.user_id = $1
order by d.created_at desc;
