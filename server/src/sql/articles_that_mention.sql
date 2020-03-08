SELECT COUNT(*) AS mention_count,
       a.id AS article_id,
       a.title AS article_title
FROM edges e1,
     edges e2,
     notes n,
     articles a
WHERE e1.$foreign_key = $1
      AND e1.edge_type = $2
      AND n.id = e1.note_id
      AND e2.note_id = e1.note_id
      AND e2.edge_type = $3
      AND e2.article_id = a.id
GROUP BY a.id
ORDER BY mention_count DESC, a.title
