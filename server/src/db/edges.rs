// Copyright (C) 2020 Inderjit Gill <email@indy.io>

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

use super::pg;
use crate::db::ideas as ideas_db;
use crate::db::ref_kind::RefKind;
use crate::error::{Error, Result};
use crate::interop::decks as decks_interop;
use crate::interop::edges as interop;
use crate::interop::{deck_kind_to_resource, Key};
use deadpool_postgres::{Client, Pool};
use serde::{Deserialize, Serialize};
use tokio_pg_mapper_derive::PostgresMapper;

#[allow(unused_imports)]
use tracing::info;

#[derive(Debug, Clone, Serialize, Deserialize, PostgresMapper)]
#[pg_mapper(table = "decks")]
pub struct MarginConnectionToDeck {
    pub note_id: Key,
    pub id: Key,
    pub name: String,
    pub deck_kind: String,
    pub ref_kind: RefKind,
}

impl From<MarginConnectionToDeck> for decks_interop::MarginConnection {
    fn from(e: MarginConnectionToDeck) -> decks_interop::MarginConnection {
        let resource = deck_kind_to_resource(e.deck_kind.as_ref()).unwrap();
        decks_interop::MarginConnection {
            note_id: e.note_id,
            id: e.id,
            name: e.name,
            resource: resource.to_string(),
            kind: decks_interop::RefKind::from(e.ref_kind),
        }
    }
}

fn is_deck_associated_with_note(
    new_deck_id: Key,
    existing_decks: &[MarginConnectionToDeck],
) -> bool {
    for existing in existing_decks {
        if existing.id == new_deck_id {
            return true;
        }
    }
    false
}

fn is_key_in_keys(k: Key, keys: &[Key]) -> bool {
    for key in keys {
        if k == *key {
            return true;
        }
    }
    false
}

pub(crate) async fn create_from_note_to_decks(
    db_pool: &Pool,
    edge: &interop::CreateEdgeFromNoteToDecks,
    user_id: Key,
) -> Result<Vec<decks_interop::MarginConnection>> {
    info!("create_from_note_to_decks");
    let mut client: Client = db_pool.get().await.map_err(Error::DeadPool)?;
    let tx = client.transaction().await?;

    let note_id = edge.note_id;

    // get the list of existing decks associated with this note
    let stmt_all_decks = include_str!("sql/decks_all_for_note.sql");
    let associated_decks: Vec<MarginConnectionToDeck> =
        pg::many::<MarginConnectionToDeck>(&tx, &stmt_all_decks, &[&note_id]).await?;

    // remove decks that are in associated_decks but not in edge.deck_ids
    let stmt_delete_deck = include_str!("sql/edges_delete_notes_decks.sql");
    for associated_deck in &associated_decks {
        if !is_key_in_keys(associated_deck.id, &edge.existing_deck_ids) {
            // this deck has been removed from the note by the user
            info!("deleting {}, {}", &note_id, &associated_deck.id);
            pg::zero(&tx, &stmt_delete_deck, &[&note_id, &associated_deck.id]).await?;
        }
    }

    // create any new edges from the note to already existing decks
    let stmt_attach_deck = include_str!("sql/edges_create_from_note_to_deck.sql");
    for deck_id in &edge.existing_deck_ids {
        if !is_deck_associated_with_note(*deck_id, &associated_decks) {
            info!("creating {}, {}", &note_id, &deck_id);
            pg::zero(&tx, &stmt_attach_deck, &[&note_id, &deck_id]).await?;
        }
    }

    // create new tags and create edges from the note to them
    //
    for new_deck_name in &edge.new_deck_names {
        // todo(<2020-03-30 Mon>): additional check to make sure that this tag doesn't already exist
        // it's a stupid thing that could happen if:
        // 1. a user has the same deck open in two windows
        // 2. adds a new tag to a note in one window
        // 3. adds the same new tag in the other window
        //
        let deck = ideas_db::create_idea_tx(&tx, user_id, &new_deck_name).await?;
        pg::zero(&tx, &stmt_attach_deck, &[&note_id, &deck.id]).await?;
    }

    tx.commit().await?;

    // return a list of [id, name, resource] containing the complete set of decks associated with this note.
    pg::many_from::<MarginConnectionToDeck, decks_interop::MarginConnection>(
        db_pool,
        &stmt_all_decks,
        &[&note_id],
    )
    .await
}
