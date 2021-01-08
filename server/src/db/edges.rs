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

use super::pg;
use crate::db::deck_kind::DeckKind;
use crate::db::ideas as ideas_db;
use crate::db::ref_kind::RefKind;
use crate::error::{Error, Result};
use crate::interop::decks as interop_decks;
use crate::interop::edges as interop;
use crate::interop::Key;
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
    pub deck_kind: DeckKind,
    pub ref_kind: RefKind,
    pub annotation: Option<String>,
}

impl From<MarginConnectionToDeck> for interop_decks::MarginConnection {
    fn from(e: MarginConnectionToDeck) -> interop_decks::MarginConnection {
        interop_decks::MarginConnection {
            note_id: e.note_id,
            id: e.id,
            name: e.name,
            resource: interop_decks::DeckResource::from(e.deck_kind),
            kind: interop_decks::RefKind::from(e.ref_kind),
            annotation: e.annotation,
        }
    }
}

fn is_deck_associated_with_note(deck_id: Key, existing_decks: &[MarginConnectionToDeck]) -> bool {
    for existing in existing_decks {
        if existing.id == deck_id {
            return true;
        }
    }
    false
}

fn is_key_in_existing_deck_references(k: Key, keys: &[interop::ExistingDeckReference]) -> bool {
    for key in keys {
        if k == key.id {
            return true;
        }
    }
    false
}

pub(crate) async fn create_from_note_to_decks(
    db_pool: &Pool,
    edge_connectivity: &interop::ProtoEdgeFromNoteToDecks,
    user_id: Key,
) -> Result<Vec<interop_decks::MarginConnection>> {
    info!("create_from_note_to_decks");
    let mut client: Client = db_pool.get().await.map_err(Error::DeadPool)?;
    let tx = client.transaction().await?;

    let note_id = edge_connectivity.note_id;

    // get the list of existing decks associated with this note
    let stmt_all_decks =
        "SELECT nd.note_id, d.id, d.name, d.kind as deck_kind, nd.kind as ref_kind, nd.annotation
                          FROM notes_decks nd, decks d
                          WHERE nd.note_id = $1 AND d.id = nd.deck_id";
    let associated_decks: Vec<MarginConnectionToDeck> =
        pg::many::<MarginConnectionToDeck>(&tx, &stmt_all_decks, &[&note_id]).await?;

    // remove decks that are in associated_decks but not in edge_connectivity.deck_ids
    let stmt_delete_deck = "DELETE FROM notes_decks WHERE note_id = $1 AND deck_id = $2";
    for associated_deck in &associated_decks {
        if !is_key_in_existing_deck_references(
            associated_deck.id,
            &edge_connectivity.existing_deck_references,
        ) {
            // this deck has been removed from the note by the user
            info!("deleting {}, {}", &note_id, &associated_deck.id);
            pg::zero(&tx, &stmt_delete_deck, &[&note_id, &associated_deck.id]).await?;
        }
    }

    // check existing deck references to see if the 'kind' or annotation has changed
    let stmt_update_ref_kind = "UPDATE notes_decks
                                SET  kind = $3, annotation = $4
                                WHERE note_id = $2 and deck_id = $1";
    for deck_reference in &edge_connectivity.existing_deck_references {
        for existing in &associated_decks {
            if existing.id == deck_reference.id {
                let r = RefKind::from(deck_reference.kind);
                if existing.ref_kind != r || existing.annotation != deck_reference.annotation {
                    pg::zero(
                        &tx,
                        &stmt_update_ref_kind,
                        &[
                            &existing.id,
                            &existing.note_id,
                            &r,
                            &deck_reference.annotation,
                        ],
                    )
                    .await?;
                }
            }
        }
    }

    // create any new edges from the note to already existing decks
    let stmt_attach_deck = "INSERT INTO notes_decks(note_id, deck_id, kind, annotation)
                            VALUES ($1, $2, $3, $4)";
    for deck_reference in &edge_connectivity.existing_deck_references {
        if !is_deck_associated_with_note(deck_reference.id, &associated_decks) {
            info!("creating {}, {}", &note_id, &deck_reference.id);
            let r = RefKind::from(deck_reference.kind);
            pg::zero(
                &tx,
                &stmt_attach_deck,
                &[&note_id, &deck_reference.id, &r, &deck_reference.annotation],
            )
            .await?;
        }
    }

    // create new tags and create edges from the note to them
    //
    for new_deck_reference in &edge_connectivity.new_deck_references {
        // todo(<2020-03-30 Mon>): additional check to make sure that this tag doesn't already exist
        // it's a stupid thing that could happen if:
        // 1. a user has the same deck open in two windows
        // 2. adds a new tag to a note in one window
        // 3. adds the same new tag in the other window
        //
        let deck = ideas_db::create_idea_tx(&tx, user_id, &new_deck_reference.name).await?;
        let no_annotation: Option<String> = None;
        let r = RefKind::from(new_deck_reference.kind);
        pg::zero(
            &tx,
            &stmt_attach_deck,
            &[&note_id, &deck.id, &r, &no_annotation],
        )
        .await?;
    }

    tx.commit().await?;

    // return a list of [id, name, resource, kind, annotation] containing the complete set of decks associated with this note.
    pg::many_from::<MarginConnectionToDeck, interop_decks::MarginConnection>(
        db_pool,
        &stmt_all_decks,
        &[&note_id],
    )
    .await
}
