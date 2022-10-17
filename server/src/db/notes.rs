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
use tracing::{error, info};

use crate::db::sqlite::{self, SqlitePool};
use rusqlite::{params, Connection, Row};

fn note_from_row(row: &Row) -> Result<interop::Note> {
    let sql_kind: i32 = row.get(2)?;

    Ok(interop::Note {
        id: row.get(0)?,
        prev_note_id: row.get(4)?,
        kind: interop::note_kind_from_sqlite(sql_kind)?,
        content: row.get(1)?,
        point_id: row.get(3)?,
    })
}

pub(crate) fn all_from_deck(sqlite_pool: &SqlitePool, deck_id: Key) -> Result<Vec<interop::Note>> {
    let conn = sqlite_pool.get()?;

    let stmt = "SELECT n.id,
                       n.content,
                       n.kind,
                       n.point_id,
                       n.prev_note_id
                FROM notes n
                WHERE n.deck_id = ?1
                ORDER BY n.id";
    sqlite::many(&conn, stmt, params!(&deck_id), note_from_row)
}

pub(crate) fn delete_note_properly(
    sqlite_pool: &SqlitePool,
    user_id: Key,
    note_id: Key,
) -> Result<Vec<interop::Note>> {
    let note = get_note(sqlite_pool, user_id, note_id)?;

    let mut conn = sqlite_pool.get()?;
    let tx = conn.transaction()?;

    // get the deck_id
    fn key_from_row(row: &Row) -> Result<Key> {
        let k: Key = row.get(0)?;
        Ok(k)
    }
    let stmt = "SELECT deck_id
                FROM notes
                WHERE id = ?1";
    let deck_id = sqlite::one(&tx, stmt, params![&note_id], key_from_row)?;

    // point the next note to the previous note
    let stmt = "SELECT id
                FROM notes
                WHERE prev_note_id = ?1";
    let next_ids = sqlite::many(&tx, stmt, params![&note_id], key_from_row)?;
    if next_ids.len() == 1 {
        let next_id = next_ids[0];

        // correctly set the next note's prev_note_id
        if let Some(prev_note_id) = note.prev_note_id {
            // if there is a note that points to this note, change it to point to prev_note_id
            update_prev_note_id(&tx, next_id, prev_note_id)?;
        } else {
            // if there is a note that points to this note, change it to point to null
            clear_prev_note_id(&tx, next_id)?;
        }
    }

    // actually delete the note
    let stmt = "DELETE
                FROM notes_decks
                WHERE note_id = ?1";
    sqlite::zero(&tx, stmt, params![&note_id])?;

    let stmt = "DELETE
                FROM notes
                WHERE id = ?1 AND user_id = ?2";
    sqlite::zero(&tx, stmt, params![&note_id, &user_id])?;

    tx.commit()?;

    // return all the notes that the parent deck has
    let all_notes = all_from_deck(sqlite_pool, deck_id)?;
    Ok(all_notes)
}

pub(crate) fn delete_all_notes_connected_with_deck(
    conn: &Connection,
    user_id: Key,
    deck_id: Key,
) -> Result<()> {
    fn id_from_row(row: &Row) -> Result<Key> {
        Ok(row.get(0)?)
    }

    let stmt = "SELECT n.id
                FROM notes n
                WHERE n.deck_id = ?1";
    let note_ids: Vec<Key> = sqlite::many(conn, stmt, params![&deck_id], id_from_row)?;

    for note_id in note_ids {
        let stmt = "DELETE
                FROM notes_decks
                WHERE note_id = ?1";
        sqlite::zero(conn, stmt, params![&note_id])?;

        let stmt = "DELETE
                FROM notes
                WHERE id = ?1 AND user_id = ?2";
        sqlite::zero(conn, stmt, params![&note_id, &user_id])?;
    }

    Ok(())
}

fn create_common(
    conn: &Connection,
    user_id: Key,
    deck_id: Key,
    kind: interop::NoteKind,
    point_id: Option<Key>,
    content: &str,
    prev_note_id: Option<Key>,
) -> Result<interop::Note> {
    let k = interop::note_kind_to_sqlite(kind);
    let stmt = "INSERT INTO notes(user_id, deck_id, kind, point_id, content, prev_note_id)
                VALUES (?1, ?2, ?3, ?4, ?5, ?6)
                RETURNING id, content, kind, point_id, prev_note_id";
    sqlite::one(
        conn,
        stmt,
        params![&user_id, &deck_id, &k, &point_id, &content, &prev_note_id],
        note_from_row,
    )
}

// note: this should be part of a transaction
//
pub(crate) fn create_note_deck_meta(
    tx: &Connection,
    user_id: Key,
    deck_id: Key,
) -> Result<interop::Note> {
    create_common(
        tx,
        user_id,
        deck_id,
        interop::NoteKind::NoteDeckMeta,
        None,
        "",
        None,
    )
}

pub(crate) fn create_notes(
    sqlite_pool: &SqlitePool,
    user_id: Key,
    note: &interop::ProtoNote,
) -> Result<Vec<interop::Note>> {
    let mut notes: Vec<interop::Note> = Vec::new();
    let mut conn = sqlite_pool.get()?;
    let tx = conn.transaction()?;

    let mut new_prev = note.prev_note_id;

    for content in note.content.iter() {
        let new_note = create_common(
            &tx,
            user_id,
            note.deck_id,
            note.kind,
            note.point_id,
            content,
            new_prev,
        )?;
        new_prev = Some(new_note.id);
        notes.push(new_note);
    }

    tx.commit()?;

    let all_notes = all_from_deck(sqlite_pool, note.deck_id)?;
    Ok(all_notes)
}

fn update_prev_note_id(conn: &Connection, note_id: Key, prev_note_id: Key) -> Result<()> {
    let stmt = "UPDATE notes
                SET prev_note_id = ?2
                WHERE id = ?1";
    sqlite::zero(conn, stmt, params![&note_id, &prev_note_id])
}

fn clear_prev_note_id(conn: &Connection, note_id: Key) -> Result<()> {
    let stmt = "UPDATE notes
                SET prev_note_id = null
                WHERE id = ?1";
    sqlite::zero(conn, stmt, params![&note_id])
}

pub(crate) fn get_note(
    sqlite_pool: &SqlitePool,
    user_id: Key,
    note_id: Key,
) -> Result<interop::Note> {
    let conn = sqlite_pool.get()?;
    get_note_(&conn, user_id, note_id)
}

fn get_note_(conn: &Connection, user_id: Key, note_id: Key) -> Result<interop::Note> {
    fn note_from_row(row: &Row) -> Result<interop::Note> {
        let sql_kind: i32 = row.get(2)?;

        Ok(interop::Note {
            id: row.get(0)?,
            kind: interop::note_kind_from_sqlite(sql_kind)?,
            content: row.get(1)?,
            point_id: None,
            prev_note_id: row.get(3)?,
        })
    }

    let stmt = "SELECT n.id,
                       n.content,
                       n.kind,
                       n.prev_note_id
                FROM notes n
                WHERE n.id = ?1 AND n.user_id = ?2";
    sqlite::one(conn, stmt, params![&note_id, &user_id], note_from_row)
}

pub(crate) fn edit_note(
    sqlite_pool: &SqlitePool,
    user_id: Key,
    note: &interop::Note,
    note_id: Key,
) -> Result<interop::Note> {
    let conn = sqlite_pool.get()?;
    let stmt = "UPDATE notes
                SET content = ?3
                WHERE id = ?2 AND user_id = ?1
                RETURNING id, content, kind, point_id, prev_note_id";
    sqlite::one(
        &conn,
        stmt,
        params![&user_id, &note_id, &note.content],
        note_from_row,
    )
}

pub fn get_all_notes_in_db(sqlite_pool: &SqlitePool) -> Result<Vec<interop::Note>> {
    let conn = sqlite_pool.get()?;
    let stmt = "SELECT n.id,
                       n.content,
                       n.kind,
                       n.point_id,
                       n.prev_note_id
                FROM   notes n
                ORDER BY n.id";
    sqlite::many(&conn, stmt, &[], note_from_row)
}
