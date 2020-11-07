select d.id, d.name, pe.source, pe.author, pe.short_description, coalesce(pe.rating, 0) as rating, d.created_at
from decks d left join publication_extras pe on pe.deck_id=d.id
where d.id not in (select deck_id
                   from notes_decks
                   group by deck_id)
and d.id not in (select n.deck_id
                 from notes n inner join notes_decks nd on n.id = nd.note_id
                 group by n.deck_id)
and d.kind = 'publication'
and d.user_id = $1
order by d.created_at desc;
