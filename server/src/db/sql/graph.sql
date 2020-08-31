select d.id as from_id, nd.deck_id as to_id, nd.kind as kind, count(*)::integer as strength
from notes_decks nd, decks d, notes n
where nd.note_id = n.id
      and n.deck_id = d.id
      and d.user_id = $1
group by from_id, to_id, nd.kind
order by from_id
