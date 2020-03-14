INSERT INTO edges($from_column, $to_column, edge_type)
VALUES ($1, $2, $3)
RETURNING $table_fields
