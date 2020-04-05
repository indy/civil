SELECT COUNT(*) AS mention_count,
       idea.id AS id,
       idea.title AS title
FROM   ideas idea,
       ideas_notes idn,
       notes_decks nd
WHERE  idn.idea_id = idea.id
       AND idn.note_id = nd.note_id
       AND nd.deck_id = $1
GROUP  BY idea.id
       ORDER BY mention_count DESC, idea.title
