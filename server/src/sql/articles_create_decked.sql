INSERT INTO decks(user_id, name, source, kind)
VALUES ($1, $2, $3, 'article'::node_kind)
RETURNING $table_fields
