SELECT nd.note_id, d.id, d.name, d.kind as deck_kind, nd.kind as ref_kind, nd.annotation
FROM notes_decks nd, decks d
WHERE nd.note_id = $1 AND d.id = nd.deck_id
