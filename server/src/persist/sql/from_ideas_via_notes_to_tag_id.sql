SELECT COUNT(*) AS mention_count,
       idea.id AS id,
       idea.title AS title
FROM   ideas idea,
       ideas_notes idn,
       notes_tags nt
WHERE  idn.idea_id = idea.id
       AND idn.note_id = nt.note_id
       AND nt.tag_id = $1
GROUP  BY idea.id
       ORDER BY mention_count DESC, idea.title
