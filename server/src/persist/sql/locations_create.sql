INSERT INTO locations(textual, longitude, latitude, fuzz)
VALUES ($1, $2, $3, $4)
RETURNING $table_fields
