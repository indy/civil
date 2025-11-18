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

use crate::db::DbError;
use crate::db::decks::deckbase_get_or_create;
use crate::db::sqlite::{self, FromRow};
use crate::interop::Key;
use crate::interop::decks::Ref;
use crate::interop::decks::{DeckKind, SlimDeck};
use crate::interop::font::Font;
use crate::interop::references::{ReferencesApplied, ReferencesDiff};
use rusqlite::{Connection, Row, named_params};

#[allow(unused_imports)]
use tracing::info;

impl FromRow for Ref {
    fn from_row(row: &Row) -> rusqlite::Result<Ref> {
        Ok(Ref {
            note_id: row.get(0)?,
            ref_kind: row.get(1)?,
            annotation: row.get(2)?,

            id: row.get(3)?,
            title: row.get(4)?,
            deck_kind: row.get(5)?,
            created_at: row.get(6)?,
            graph_terminator: row.get(7)?,
            insignia: row.get(8)?,
            font: row.get(9)?,
            impact: row.get(10)?,
        })
    }
}

pub(crate) fn update_references(
    conn: &mut rusqlite::Connection,
    diff: ReferencesDiff,
    user_id: Key,
    note_id: Key,
) -> Result<ReferencesApplied, DbError> {
    info!("update_references");
    let tx = conn.transaction()?;

    let stmt_refs_removed = "DELETE FROM refs WHERE note_id = :note_id AND deck_id = :removed_id";
    for removed in &diff.references_removed {
        // this deck has been removed from the note by the user
        info!("deleting {}, {}", &note_id, &removed.id);
        sqlite::zero(
            &tx,
            stmt_refs_removed,
            named_params! {":note_id": note_id, ":removed_id": removed.id},
        )?;
    }

    let stmt_refs_changed = "UPDATE refs
                             SET  kind = :ref_kind, annotation = :annotation
                             WHERE note_id = :note_id and deck_id = :changed_id";
    for changed in &diff.references_changed {
        info!(
            "updating properties of an existing reference {} {}",
            note_id, changed.id
        );

        sqlite::zero(
            &tx,
            stmt_refs_changed,
            named_params! {
                ":changed_id": changed.id,
                ":note_id": note_id,
                ":ref_kind": changed.ref_kind,
                ":annotation": changed.annotation
            },
        )?;
    }

    let stmt_refs_added = "INSERT INTO refs(note_id, deck_id, kind, annotation)
                           VALUES (:note_id, :deck_id, :kind, :annotation)";
    for added in &diff.references_added {
        info!(
            "creating new edge to pre-existing deck {}, {}",
            &note_id, &added.id
        );
        sqlite::zero(
            &tx,
            stmt_refs_added,
            named_params! {
                ":note_id": note_id,
                ":deck_id": added.id,
                ":kind": added.ref_kind,
                ":annotation": added.annotation
            },
        )?;
    }

    // create new tags and create edges from the note to them
    //
    for created in &diff.references_created {
        info!("create new idea: {} and a new edge", created.title);
        let (deck, _created) = deckbase_get_or_create(
            &tx,
            user_id,
            DeckKind::Idea,
            &created.title,
            false,
            0,
            Font::Serif,
            1,
        )?;
        sqlite::zero(
            &tx,
            stmt_refs_added,
            named_params! {
                ":note_id": note_id,
                ":deck_id": deck.id,
                ":kind": created.ref_kind,
                ":annotation": created.annotation
            },
        )?;
    }

    // return a list of [id, name, resource, kind, annotation] containing the complete set
    // of decks associated with this note.
    //
    let stmt_all_decks = "SELECT r.note_id, r.kind as ref_kind, r.annotation,
                          d.id, d.name, d.kind as deck_kind, d.created_at,
                          d.graph_terminator, d.insignia, d.font, d.impact
         FROM refs r, decks d
         WHERE r.note_id = :note_id AND d.id = r.deck_id";
    let refs: Vec<Ref> = sqlite::many(&tx, stmt_all_decks, named_params! {":note_id": note_id})?;

    let recents = decks_recently_referenced(&tx, user_id)?;

    tx.commit()?;

    Ok(ReferencesApplied { refs, recents })
}

pub(crate) fn decks_recently_referenced(
    conn: &Connection,
    user_id: Key,
) -> Result<Vec<SlimDeck>, DbError> {
    let stmt_recent_refs = "
         SELECT DISTINCT deck_id, title, kind, created_at, graph_terminator, insignia, font, impact
         FROM (
              SELECT r.deck_id, d.name as title, d.kind, d.created_at, d.graph_terminator, d.insignia, d.font, d.impact
              FROM refs r, decks d
              WHERE r.deck_id = d.id AND d.user_id = :user_id
              ORDER BY r.created_at DESC
              LIMIT 100) -- without this limit query returns incorrect results
         LIMIT 8";

    sqlite::many(conn, stmt_recent_refs, named_params! {":user_id": user_id})
}
