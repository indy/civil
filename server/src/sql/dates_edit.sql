UPDATE dates
SET textual = $2, exact_date = $3, lower_date = $4, upper_date = $5, fuzz = $6
WHERE id = $1
RETURNING $table_fields
