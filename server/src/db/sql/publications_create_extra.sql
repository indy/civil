INSERT INTO publication_extras(deck_id, source, author, short_description, rating)
VALUES ($1, $2, $3, $4, $5)
RETURNING $table_fields
