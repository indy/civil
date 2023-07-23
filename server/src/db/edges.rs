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
use crate::interop::decks as interop_decks;
use crate::interop::decks::{DeckKind, SlimDeck};
use crate::interop::edges as interop;
use crate::interop::Key;

use rusqlite::{params, Connection, Row};
use std::str::FromStr;
#[allow(unused_imports)]
use tracing::info;

fn ref_from_row(row: &Row) -> crate::Result<interop_decks::Ref> {
    let kind: String = row.get(3)?;
    let rk: String = row.get(4)?;

    Ok(interop_decks::Ref {
        note_id: row.get(0)?,
        id: row.get(1)?,
        title: row.get(2)?,
        deck_kind: interop_decks::DeckKind::from_str(&kind)?,
        ref_kind: interop_decks::RefKind::from_str(&rk)?,
        annotation: row.get(5)?,
        insignia: row.get(6)?,
        typeface: row.get(7)?,
    })
}

pub(crate) fn create_from_note_to_decks(
    sqlite_pool: &SqlitePool,
    note_references: &interop::ProtoNoteReferences,
    user_id: Key,
) -> crate::Result<interop::ReferencesApplied> {
    info!("create_from_note_to_decks");
    let mut conn = sqlite_pool.get()?;
    let tx = conn.transaction()?;

    let note_id = note_references.note_id;

    let stmt_refs_removed = "DELETE FROM notes_decks WHERE note_id = ?1 AND deck_id = ?2";
    for removed in &note_references.references_removed {
        // this deck has been removed from the note by the user
        info!("deleting {}, {}", &note_id, &removed.id);
        sqlite::zero(&tx, stmt_refs_removed, params![&note_id, &removed.id])?;
    }

    let stmt_refs_changed = "UPDATE notes_decks
                             SET  kind = ?3, annotation = ?4
                             WHERE note_id = ?2 and deck_id = ?1";
    for changed in &note_references.references_changed {
        info!(
            "updating properties of an existing reference {} {}",
            note_id, changed.id
        );

        sqlite::zero(
            &tx,
            stmt_refs_changed,
            params![
                &changed.id,
                &note_id,
                &changed.ref_kind.to_string(),
                &changed.annotation
            ],
        )?;
    }

    let stmt_refs_added = "INSERT INTO notes_decks(note_id, deck_id, kind, annotation)
                           VALUES (?1, ?2, ?3, ?4)";
    for added in &note_references.references_added {
        info!(
            "creating new edge to pre-existing deck {}, {}",
            &note_id, &added.id
        );
        sqlite::zero(
            &tx,
            stmt_refs_added,
            params![
                &note_id,
                &added.id,
                &added.ref_kind.to_string(),
                &added.annotation
            ],
        )?;
    }

    // create new tags and create edges from the note to them
    //
    for created in &note_references.references_created {
        info!("create new idea: {} and a new edge", created.title);
        let (deck, _created) = decks_db::deckbase_get_or_create(
            &tx,
            user_id,
            DeckKind::Idea,
            &created.title,
            "serif",
        )?;
        sqlite::zero(
            &tx,
            stmt_refs_added,
            params![
                &note_id,
                &deck.id,
                &created.ref_kind.to_string(),
                &created.annotation
            ],
        )?;
    }

    // return a list of [id, name, resource, kind, annotation] containing the complete set of decks associated with this note.
    let stmt_all_decks =
        "SELECT nd.note_id, d.id, d.name, d.kind as deck_kind, nd.kind as ref_kind, nd.annotation, d.insignia, d.typeface
                          FROM notes_decks nd, decks d
                          WHERE nd.note_id = ?1 AND d.id = nd.deck_id";
    let refs = sqlite::many(&tx, stmt_all_decks, params![&note_id], ref_from_row)?;

    let recents = get_recents(&tx, user_id)?;

    tx.commit()?;

    Ok(interop::ReferencesApplied { refs, recents })
}

pub(crate) fn get_recently_used_decks(
    sqlite_pool: &SqlitePool,
    user_id: Key,
) -> crate::Result<Vec<SlimDeck>> {
    let conn = sqlite_pool.get()?;
    get_recents(&conn, user_id)
}

fn get_recents(conn: &Connection, user_id: Key) -> crate::Result<Vec<SlimDeck>> {
    let stmt_recent_refs = "SELECT DISTINCT deck_id, title, kind, insignia, typeface
         FROM (
              SELECT nd.deck_id, d.name as title, d.kind, d.insignia, d.typeface
              FROM notes_decks nd, decks d
              WHERE nd.deck_id = d.id AND d.user_id = ?1
              ORDER BY nd.created_at DESC
              LIMIT 100) -- without this limit query returns incorrect results
         LIMIT 8";

    sqlite::many(
        conn,
        stmt_recent_refs,
        params![&user_id],
        decks_db::slimdeck_from_row,
    )
}
