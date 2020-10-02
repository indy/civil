UPDATE points
SET title = $2, kind = $3, location_textual = $4, longitude = $5, latitude = $6, location_fuzz = $7, date_textual = $8, exact_date = $9, lower_date = $10, upper_date = $11, date_fuzz = $12
WHERE id = $1
RETURNING $table_fields
