SELECT n.id
FROM   notes n,
       tags_notes tn
WHERE  tn.tag_id = $1 AND n.id = tn.note_id
UNION
SELECT n.id
FROM   notes n,
       notes_tags nt
WHERE  nt.tag_id = $1 AND n.id = nt.note_id;
