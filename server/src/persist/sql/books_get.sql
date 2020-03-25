SELECT id, name, source
FROM decks
WHERE user_id = $1 and id = $2 and kind = 'book'
