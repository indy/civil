INSERT INTO publication_extras(deck_id, source, author)
VALUES ($1, $2, $3)
RETURNING $table_fields
