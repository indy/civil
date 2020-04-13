UPDATE decks
SET name = $3
WHERE id = $2 and user_id = $1
