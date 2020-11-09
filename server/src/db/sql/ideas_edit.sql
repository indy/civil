UPDATE decks
SET name = $3, graph_terminator = $4
WHERE user_id = $1 and id = $2 and kind = 'idea'::deck_kind
RETURNING $table_fields
