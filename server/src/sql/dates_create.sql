INSERT INTO dates(textual, exact_date, lower_date, upper_date, fuzz)
VALUES ($1, $2, $3, $4, $5)
RETURNING $table_fields
