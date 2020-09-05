UPDATE decks
SET name = $3, idea_category = $4
WHERE user_id = $1 and id = $2 and kind = 'idea'::deck_kind
RETURNING $table_fields
