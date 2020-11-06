select deck_id, source, author, short_description, rating
from publication_extras
where deck_id=$1
