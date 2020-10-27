SELECT decks.id, decks.name, decks.created_at, idea_extras.idea_category
FROM decks left join idea_extras on idea_extras.deck_id = decks.id
WHERE user_id = $1 and kind = 'idea'
ORDER BY name
