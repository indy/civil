SELECT decks.id, decks.name, publication_extras.source, publication_extras.author, decks.created_at
FROM decks left join publication_extras on publication_extras.deck_id = decks.id
WHERE user_id = $1 and kind = 'publication'
ORDER BY created_at desc
