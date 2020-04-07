SELECT COUNT(*) AS mention_count,
       tag.id AS id,
       tag.name AS name
FROM  tags tag,
      tags_notes tn,
      notes_tags nt
WHERE tn.tag_id = tag.id
      AND tn.note_id = nt.note_id
      AND nt.tag_id = $1
GROUP BY tag.id
ORDER BY mention_count DESC, tag.name