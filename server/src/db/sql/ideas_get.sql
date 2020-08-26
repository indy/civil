SELECT id, name, created_at, idea_category
FROM decks
WHERE user_id = $1 and id = $2 and kind = 'idea'
