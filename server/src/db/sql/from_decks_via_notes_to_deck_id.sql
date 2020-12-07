SELECT d.id AS id,
       d.name AS name,
       d.kind,
       n.content,
       n.id as note_id
FROM decks d,
     notes n,
     notes_decks nd
WHERE n.deck_id = d.id
      AND nd.note_id = n.id
      AND nd.deck_id = $1;
