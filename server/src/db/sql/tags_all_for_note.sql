select d.id as id, d.name as name
from decks d, notes_decks nd
where nd.note_id = $1
      and nd.deck_id = d.id
      and d.kind = 'tag'
