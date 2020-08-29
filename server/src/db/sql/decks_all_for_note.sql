SELECT nd.note_id as note_id, d.id AS id, d.name AS name, d.kind as deck_kind, nd.kind as ref_kind
FROM notes_decks nd,
     decks d
WHERE nd.note_id = $1
      AND d.id = nd.deck_id
