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

use crate::db::decks as decks_db;
use crate::db::sqlite::{self, SqlitePool};
use crate::error::Result;
use crate::interop::decks as interop_decks;
use crate::interop::decks::{deck_kind_from_sqlite_string, DeckKind};
use crate::interop::edges as interop;
use crate::interop::Key;

use rusqlite::{params, Row};
#[allow(unused_imports)]
use tracing::info;

fn from_row(row: &Row) -> Result<interop_decks::Ref> {
    let kind: String = row.get(3)?;
    let deck_kind = deck_kind_from_sqlite_string(kind.as_str())?;

    let rk: String = row.get(4)?;

    Ok(interop_decks::Ref {
        note_id: row.get(0)?,
        id: row.get(1)?,
        name: row.get(2)?,
        resource: interop_decks::DeckKind::from(deck_kind),
        ref_kind: interop_decks::ref_kind_from_sqlite_string(rk.as_str())?,
        annotation: row.get(5)?,
    })
}

pub(crate) fn create_from_note_to_decks(
    sqlite_pool: &SqlitePool,
    note_references: &interop::ProtoNoteReferences,
    user_id: Key,
) -> Result<Vec<interop_decks::Ref>> {
    info!("create_from_note_to_decks");
    let mut conn = sqlite_pool.get()?;
    let tx = conn.transaction()?;

    let note_id = note_references.note_id;

    let stmt_refs_removed = "DELETE FROM notes_decks WHERE note_id = ?1 AND deck_id = ?2";
    for removed in &note_references.references_removed {
        // this deck has been removed from the note by the user
        info!("deleting {}, {}", &note_id, &removed.id);
        sqlite::zero(&tx, &stmt_refs_removed, params![&note_id, &removed.id])?;
    }

    let stmt_refs_changed = "UPDATE notes_decks
                             SET  kind = ?3, annotation = ?4
                             WHERE note_id = ?2 and deck_id = ?1";
    for changed in &note_references.references_changed {
        info!(
            "updating properties of an existing reference {} {}",
            note_id, changed.id
        );

        let rstr = interop_decks::sqlite_string_from_ref_kind(changed.ref_kind)?;

        sqlite::zero(
            &tx,
            &stmt_refs_changed,
            params![&changed.id, &note_id, &rstr, &changed.annotation],
        )?;
    }

    let stmt_refs_added = "INSERT INTO notes_decks(note_id, deck_id, kind, annotation)
                           VALUES (?1, ?2, ?3, ?4)";
    for added in &note_references.references_added {
        info!(
            "creating new edge to pre-existing deck {}, {}",
            &note_id, &added.id
        );
        let rstr = interop_decks::sqlite_string_from_ref_kind(added.ref_kind)?;
        sqlite::zero(
            &tx,
            &stmt_refs_added,
            params![&note_id, &added.id, &rstr, &added.annotation],
        )?;
    }

    // create new tags and create edges from the note to them
    //
    for created in &note_references.references_created {
        info!("create new idea: {} and a new edge", created.name);
        let (deck, _created) =
            decks_db::deckbase_get_or_create(&tx, user_id, DeckKind::Idea, &created.name)?;
        let rstr = interop_decks::sqlite_string_from_ref_kind(created.ref_kind)?;
        sqlite::zero(
            &tx,
            &stmt_refs_added,
            params![&note_id, &deck.id, &rstr, &created.annotation],
        )?;
    }

    // return a list of [id, name, resource, kind, annotation] containing the complete set of decks associated with this note.
    let stmt_all_decks =
        "SELECT nd.note_id, d.id, d.name, d.kind as deck_kind, nd.kind as ref_kind, nd.annotation
                          FROM notes_decks nd, decks d
                          WHERE nd.note_id = ?1 AND d.id = nd.deck_id";
    let res = sqlite::many(&tx, &stmt_all_decks, params![&note_id], from_row)?;

    tx.commit()?;

    Ok(res)
}
