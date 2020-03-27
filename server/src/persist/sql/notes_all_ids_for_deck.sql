SELECT n.id
FROM   notes n,
       decks_notes dn
WHERE  dn.deck_id = $1 AND n.id = dn.note_id
UNION
SELECT n.id
FROM   notes n,
       notes_decks nd
WHERE  nd.deck_id = $1 AND n.id = nd.note_id;
