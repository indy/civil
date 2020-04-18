INSERT INTO decks(user_id, name, source, author, kind)
VALUES ($1, $2, $3, $4, 'article'::deck_kind)
RETURNING $table_fields
