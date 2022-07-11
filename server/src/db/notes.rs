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

use crate::error::Result;
use crate::interop::notes as interop;
use crate::interop::Key;

#[allow(unused_imports)]
use tracing::info;

use crate::db::sqlite::{self, SqlitePool};
use rusqlite::{params, Connection, Row};

fn note_from_row(row: &Row) -> Result<interop::Note> {
    Ok(interop::Note {
        id: row.get(0)?,
        kind: interop::note_kind_from_sqlite_string(row.get(2)?)?,
        content: row.get(1)?,
        point_id: row.get(3)?,
    })
}

pub(crate) fn all_from_deck(sqlite_pool: &SqlitePool, deck_id: Key) -> Result<Vec<interop::Note>> {
    let conn = sqlite_pool.get()?;

    sqlite::many(
        &conn,
        "SELECT n.id,
                         n.content,
                         n.kind,
                         n.point_id
                  FROM   notes n
                  WHERE  n.deck_id = ?1
                  ORDER BY n.id",
        params!(&deck_id),
        note_from_row,
    )
}

pub(crate) fn delete_note(conn: &Connection, user_id: Key, note_id: Key) -> Result<()> {
    sqlite::zero(
        &conn,
        "DELETE FROM notes_decks
                  WHERE   note_id = ?1",
        params![&note_id],
    )?;

    sqlite::zero(
        &conn,
        "DELETE FROM notes
                  WHERE   id = ?1 AND user_id = ?2",
        params![&note_id, &user_id],
    )?;

    Ok(())
}

pub(crate) fn delete_note_pool(sqlite_pool: &SqlitePool, user_id: Key, note_id: Key) -> Result<()> {
    let conn = sqlite_pool.get()?;
    delete_note(&conn, user_id, note_id)
}

pub(crate) fn delete_all_notes_connected_with_deck(
    conn: &Connection,
    user_id: Key,
    deck_id: Key,
) -> Result<()> {
    fn id_from_row(row: &Row) -> Result<Key> {
        Ok(row.get(0)?)
    }

    let note_ids: Vec<Key> = sqlite::many(
        &conn,
        "SELECT n.id
                                 FROM   notes n
                                 WHERE  n.deck_id = ?1",
        params![&deck_id],
        id_from_row,
    )?;

    for note_id in note_ids {
        delete_note(&conn, user_id, note_id)?;
    }

    Ok(())
}

pub(crate) fn create_common(
    conn: &Connection,
    user_id: Key,
    deck_id: Key,
    kind: interop::NoteKind,
    point_id: Option<Key>,
    content: &str,
) -> Result<interop::Note> {
    let k = interop::note_kind_to_sqlite_string(kind)?;

    sqlite::one(
        &conn,
        "INSERT INTO notes(user_id, deck_id, kind, point_id, content)
                 VALUES (?1, ?2, ?3, ?4, ?5)
                 RETURNING id, content, kind, point_id",
        params![&user_id, &deck_id, &k, &point_id, &content],
        note_from_row,
    )
}

pub(crate) fn create_notes(
    sqlite_pool: &SqlitePool,
    user_id: Key,
    note: &interop::ProtoNote,
) -> Result<Vec<interop::Note>> {
    let mut notes: Vec<interop::Note> = Vec::new();
    let conn = sqlite_pool.get()?;

    for content in note.content.iter() {
        notes.push(create_common(
            &conn,
            user_id,
            note.deck_id,
            note.kind,
            note.point_id,
            content,
        )?);
    }

    Ok(notes)
}

pub(crate) fn get_note(
    sqlite_pool: &SqlitePool,
    user_id: Key,
    note_id: Key,
) -> Result<interop::Note> {
    fn note_from_row(row: &Row) -> Result<interop::Note> {
        Ok(interop::Note {
            id: row.get(0)?,
            kind: interop::note_kind_from_sqlite_string(row.get(2)?)?,
            content: row.get(1)?,
            point_id: None,
        })
    }

    let conn = sqlite_pool.get()?;
    sqlite::one(
        &conn,
        "SELECT n.id,
                        n.content,
                        n.kind
                 FROM notes n
                 WHERE n.id = ?1 AND n.user_id = ?2",
        params![&note_id, &user_id],
        note_from_row,
    )
}

pub(crate) fn edit_note(
    sqlite_pool: &SqlitePool,
    user_id: Key,
    note: &interop::Note,
    note_id: Key,
) -> Result<interop::Note> {
    let conn = sqlite_pool.get()?;

    sqlite::one(
        &conn,
        "UPDATE notes
                 SET content = ?3
                 WHERE id = ?2 and user_id = ?1
                 RETURNING id, content, kind, point_id",
        params![&user_id, &note_id, &note.content],
        note_from_row,
    )
}

pub fn get_all_notes_in_db(sqlite_pool: &SqlitePool) -> Result<Vec<interop::Note>> {
    let conn = sqlite_pool.get()?;

    sqlite::many(
        &conn,
        "SELECT n.id,
                n.content,
                n.kind,
                n.point_id
         FROM   notes n
         ORDER BY n.id",
        &[],
        note_from_row,
    )
}
