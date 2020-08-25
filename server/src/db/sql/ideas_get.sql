SELECT id, name, created_at, idea
FROM decks
WHERE user_id = $1 and id = $2 and kind = 'idea'
