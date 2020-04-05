SELECT n.id
FROM   notes n,
       ideas_notes idn
WHERE  idn.idea_id = $1 AND n.id = idn.note_id
