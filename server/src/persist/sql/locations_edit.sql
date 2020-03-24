UPDATE locations
SET textual = $2, longitude = $3, latitude = $4, fuzz = $5
WHERE id = $1
RETURNING $table_fields
