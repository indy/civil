DELETE FROM notes
USING   edges
WHERE   edges.$foreign_key = $1
        AND notes.id = edges.note_id
