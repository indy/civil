INSERT INTO decks(user_id, name, kind)
VALUES ($1, $2, 'subject'::node_kind)
RETURNING $table_fields
