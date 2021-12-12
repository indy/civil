// Copyright (C) 2021 Inderjit Gill <email@indy.io>

// This file is part of Civil

// Civil is free software: you can redistribute it and/or modify
// it under the terms of the GNU Affero General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.

// Civil is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
// GNU Affero General Public License for more details.

// You should have received a copy of the GNU Affero General Public License
// along with this program.  If not, see <https://www.gnu.org/licenses/>.

use crate::db::deck_kind::DeckKind;
use crate::db::decks;
use crate::error::{Error, Result};
use crate::interop::unioned as interop;
use crate::interop::Key;
use deadpool_postgres::{Client, Pool, Transaction};

use crate::db::publications::{publication_extra_get, publication_from_deckbase_and_extra};
use crate::db::people::{person_from_deckbase};
use crate::db::ideas::{idea_from_deckbase};
use crate::db::timelines::{timeline_from_deckbase};

#[allow(unused_imports)]
use tracing::info;

pub(crate) async fn get(db_pool: &Pool, user_id: Key, deck_ids: Vec<Key>) -> Result<Vec<interop::UnionedDeck>> {

    let mut client: Client = db_pool.get().await.map_err(Error::DeadPool)?;
    let tx = client.transaction().await?;

    let mut res: Vec<interop::UnionedDeck> = vec![];

    for deck_id in deck_ids {
        let deck = decks::deckbase_get(&tx, user_id, deck_id).await?;
        let r: interop::UnionedDeck = match deck.kind {
            DeckKind::Publication => publication_in_union(&tx, deck).await?,
            DeckKind::Person => person_in_union(deck)?,
            DeckKind::Idea => idea_in_union(deck)?,
            DeckKind::Timeline => timeline_in_union(deck)?,
        };
        res.push(r);
    }

    tx.commit().await?;

    Ok(res)
}

/*
pub(crate) async fn get1(db_pool: &Pool, user_id: Key, deck_id: Key) -> Result<interop::UnionedDeck> {

    let mut client: Client = db_pool.get().await.map_err(Error::DeadPool)?;
    let tx = client.transaction().await?;

    let deck = decks::deckbase_get(&tx, user_id, deck_id).await?;
    let res: interop::UnionedDeck = match deck.kind {
        DeckKind::Publication => publication_in_union(&tx, deck).await?,
        DeckKind::Person => person_in_union(deck)?,
        DeckKind::Idea => idea_in_union(deck)?,
        DeckKind::Timeline => timeline_in_union(deck)?,
    };

    tx.commit().await?;

    Ok(res)
}
*/

async fn publication_in_union(tx: &Transaction<'_>, deck: decks::DeckBase) -> Result<interop::UnionedDeck>
{
    let publication_extra = publication_extra_get(&tx, deck.id).await?;
    let p = publication_from_deckbase_and_extra(deck, publication_extra);

    Ok(interop::UnionedDeck::Publication(p))
}

fn person_in_union(deck: decks::DeckBase) -> Result<interop::UnionedDeck>
{
    let p = person_from_deckbase(deck);
    Ok(interop::UnionedDeck::Person(p))
}

fn idea_in_union(deck: decks::DeckBase) -> Result<interop::UnionedDeck>
{
    let i = idea_from_deckbase(deck);
    Ok(interop::UnionedDeck::Idea(i))
}
fn timeline_in_union(deck: decks::DeckBase) -> Result<interop::UnionedDeck>
{
    let t = timeline_from_deckbase(deck);
    Ok(interop::UnionedDeck::Timeline(t))
}
