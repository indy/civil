INSERT INTO decks(user_id, kind, name, graph_terminator)
VALUES ($1, $2, $3, $4)
RETURNING $table_fields
