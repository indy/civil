SELECT n.id,
       n.note_type,
       n.source,
       n.content,
       n.annotation,
       n.separator,
       e.edge_type
FROM   notes n,
       edges e
WHERE  e.$foreign_key = $1
       AND e.edge_type = $2
       AND n.id = e.note_id
       AND n.note_type = $3
