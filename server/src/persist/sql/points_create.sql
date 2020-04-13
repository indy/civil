INSERT INTO points(title, location_textual, longitude, latitude, location_fuzz, date_textual, exact_date, lower_date, upper_date, date_fuzz)
VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
RETURNING $table_fields
