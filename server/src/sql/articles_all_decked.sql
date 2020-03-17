SELECT id, name, source
FROM decks
WHERE user_id = $1 and kind = 'article'
