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
use crate::db::decks as decks_db;
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
pub struct Ref {
    pub note_id: Key,
    pub id: Key,
    pub name: String,
    pub deck_kind: DeckKind,
    pub ref_kind: RefKind,
    pub annotation: Option<String>,
}

impl From<Ref> for interop_decks::Ref {
    fn from(e: Ref) -> interop_decks::Ref {
        interop_decks::Ref {
            note_id: e.note_id,
            id: e.id,
            name: e.name,
            resource: interop_decks::DeckResource::from(e.deck_kind),
            ref_kind: interop_decks::RefKind::from(e.ref_kind),
            annotation: e.annotation,
        }
    }
}

pub(crate) async fn create_from_note_to_decks(
    db_pool: &Pool,
    note_references: &interop::ProtoNoteReferences,
    user_id: Key,
) -> Result<Vec<interop_decks::Ref>> {
    info!("create_from_note_to_decks");
    let mut client: Client = db_pool.get().await.map_err(Error::DeadPool)?;
    let tx = client.transaction().await?;

    let note_id = note_references.note_id;

    let stmt_refs_removed = "DELETE FROM notes_decks WHERE note_id = $1 AND deck_id = $2";
    for removed in &note_references.references_removed {
        // this deck has been removed from the note by the user
        info!("deleting {}, {}", &note_id, &removed.id);
        pg::zero(&tx, &stmt_refs_removed, &[&note_id, &removed.id]).await?;
    }

    let stmt_refs_changed = "UPDATE notes_decks
                             SET  kind = $3, annotation = $4
                             WHERE note_id = $2 and deck_id = $1";
    for changed in &note_references.references_changed {
        info!(
            "updating properties of an existing reference {} {}",
            note_id, changed.id
        );
        let r = RefKind::from(changed.ref_kind);
        pg::zero(
            &tx,
            &stmt_refs_changed,
            &[&changed.id, &note_id, &r, &changed.annotation],
        )
        .await?;
    }

    let stmt_refs_added = "INSERT INTO notes_decks(note_id, deck_id, kind, annotation)
                           VALUES ($1, $2, $3, $4)";
    for added in &note_references.references_added {
        info!(
            "creating new edge to pre-existing deck {}, {}",
            &note_id, &added.id
        );
        let r = RefKind::from(added.ref_kind);
        pg::zero(
            &tx,
            &stmt_refs_added,
            &[&note_id, &added.id, &r, &added.annotation],
        )
        .await?;
    }

    // create new tags and create edges from the note to them
    //
    for created in &note_references.references_created {
        info!("create new idea: {} and a new edge", created.name);
        let (deck, _created) =
            decks_db::deckbase_get_or_create(&tx, user_id, DeckKind::Idea, &created.name).await?;
        let r = RefKind::from(created.ref_kind);
        pg::zero(
            &tx,
            &stmt_refs_added,
            &[&note_id, &deck.id, &r, &created.annotation],
        )
        .await?;
    }

    tx.commit().await?;

    // return a list of [id, name, resource, kind, annotation] containing the complete set of decks associated with this note.
    let stmt_all_decks =
        "SELECT nd.note_id, d.id, d.name, d.kind as deck_kind, nd.kind as ref_kind, nd.annotation
                          FROM notes_decks nd, decks d
                          WHERE nd.note_id = $1 AND d.id = nd.deck_id";
    pg::many_from::<Ref, interop_decks::Ref>(db_pool, &stmt_all_decks, &[&note_id]).await
}
