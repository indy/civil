SELECT n.id
FROM   notes n,
       edges2 e
WHERE  (e.from_deck_id = $1 AND e.to_note_id = n.id)
       OR (e.to_deck_id = $1 AND e.from_note_id = n.id)
