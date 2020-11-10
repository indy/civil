UPDATE decks
SET name = $4, graph_terminator = $5
WHERE user_id = $1 and id = $2 and kind = $3
RETURNING $table_fields
