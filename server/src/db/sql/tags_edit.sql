UPDATE decks
SET name = $3
WHERE user_id = $1 and id = $2 and kind = 'tag'::deck_kind
RETURNING $table_fields
