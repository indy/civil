SELECT count(*) as count
FROM decks
WHERE user_id = $1 and name = $2 and kind = 'tag'
