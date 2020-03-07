SELECT n.id as note_id,
       s.id as subject_id,
       s.name as subject_name
FROM   edges e1,
       edges e2,
       notes n,
       subjects s
WHERE  e1.$foreign_key = $1
       AND e1.edge_type = $2
       AND n.id = e1.note_id
       AND e2.note_id = e1.note_id
       AND e2.edge_type = $3
       AND e2.subject_id = s.id
