SELECT n.id
FROM   notes n,
WHERE  n.deck_id = $1
UNION
SELECT n.id
FROM   notes n,
       notes_decks nd
WHERE  nd.deck_id = $1 AND n.id = nd.note_id;
