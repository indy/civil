DELETE FROM points
USING decks_points
WHERE decks_points.deck_id = $1 and points.id = decks_points.point_id
