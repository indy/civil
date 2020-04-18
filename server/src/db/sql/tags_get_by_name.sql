SELECT id, name
FROM decks
WHERE user_id = $1 and name = $2 and kind = 'tag'
