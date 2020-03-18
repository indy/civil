UPDATE decks
SET name = $3, source = $4
WHERE user_id = $1 and id = $2 and kind = 'article'::node_kind
RETURNING $table_fields
