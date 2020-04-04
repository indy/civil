SELECT COUNT(*) AS mention_count,
       d.id AS id,
       d.title AS title
FROM  ideas d,
      ideas_notes dn,
      notes_tags nt
WHERE dn.idea_id = d.id
      AND dn.note_id = nt.note_id
      AND nt.tag_id = $1
GROUP BY d.id
    ORDER BY mention_count DESC, d.title
