SELECT decks.id, decks.name, decks.created_at, decks.graph_terminator, idea_extras.idea_category
FROM decks left join idea_extras on idea_extras.deck_id = decks.id
WHERE user_id = $1 and id = $2 and kind = 'idea'
