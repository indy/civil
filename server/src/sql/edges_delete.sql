DELETE FROM edges
WHERE   edges.$foreign_key = $1
