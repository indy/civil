SELECT COUNT(*) AS mention_count,
       p.id AS person_id,
       p.name AS person_name
FROM edges e1,
     edges e2,
     notes n,
     historic_people p
WHERE e1.$foreign_key = $1
      AND e1.edge_type = $2
      AND n.id = e1.note_id
      AND e2.note_id = e1.note_id
      AND e2.edge_type = $3
      AND e2.historic_person_id = p.id
GROUP BY p.id
ORDER BY mention_count DESC, p.name
