UPDATE points
SET title = $2, location_textual = $3, longitude = $4, latitude = $5, location_fuzz = $6, date_textual = $7, exact_date = $8, lower_date = $9, upper_date = $10, date_fuzz = $11
WHERE id = $1
RETURNING $table_fields
