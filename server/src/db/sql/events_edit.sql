UPDATE decks
SET name = $3
WHERE user_id = $1 and id = $2 and kind = 'event'::deck_kind
