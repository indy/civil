SELECT id, kind::TEXT
FROM decks
WHERE user_id = $1 and kind = 'subject'
