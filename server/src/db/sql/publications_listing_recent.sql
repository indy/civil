SELECT decks.id, decks.name, publication_extras.source, publication_extras.author, publication_extras.short_description, coalesce(publication_extras.rating, 0) as rating, decks.created_at
from decks left join publication_extras on publication_extras.deck_id = decks.id
where user_id = $1 and kind = 'publication'
order by created_at desc
limit 10;
