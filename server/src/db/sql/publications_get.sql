SELECT id, name, source, author
FROM decks
WHERE user_id = $1 and id = $2 and kind = 'publication'
