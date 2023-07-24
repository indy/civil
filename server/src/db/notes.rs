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

use crate::interop::font::Font;
use crate::interop::notes as interop;
use crate::interop::Key;

#[allow(unused_imports)]
use tracing::{error, info};

use crate::db::sqlite::{self, SqlitePool};
use rusqlite::{params, Connection, Row};

fn note_from_row(row: &Row) -> crate::Result<interop::Note> {
    let sql_kind: i32 = row.get(2)?;
    let fnt: i32 = row.get(5)?;

    Ok(interop::Note {
        id: row.get(0)?,
        prev_note_id: row.get(4)?,
        kind: interop::NoteKind::try_from(sql_kind)?,
        content: row.get(1)?,
        point_id: row.get(3)?,
        font: Font::try_from(fnt)?,
    })
}

pub(crate) fn all_from_deck(
    sqlite_pool: &SqlitePool,
    deck_id: Key,
) -> crate::Result<Vec<interop::Note>> {
    let conn = sqlite_pool.get()?;

    let stmt = "SELECT n.id,
                       n.content,
                       n.kind,
                       n.point_id,
                       n.prev_note_id,
                       n.font
                FROM notes n
                WHERE n.deck_id = ?1
                ORDER BY n.id";
    sqlite::many(&conn, stmt, params!(&deck_id), note_from_row)
}

pub(crate) fn delete_note_properly(
    sqlite_pool: &SqlitePool,
    user_id: Key,
    note_id: Key,
) -> crate::Result<Vec<interop::Note>> {
    let note = get_note(sqlite_pool, user_id, note_id)?;

    let mut conn = sqlite_pool.get()?;
    let tx = conn.transaction()?;

    // get the deck_id
    fn key_from_row(row: &Row) -> crate::Result<Key> {
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

pub(crate) fn create_common(
    conn: &Connection,
    user_id: Key,
    deck_id: Key,
    font: Font,
    kind: interop::NoteKind,
    point_id: Option<Key>,
    content: &str,
    prev_note_id: Option<Key>,
    next_note_id: Option<Key>,
) -> crate::Result<interop::Note> {
    let stmt = "INSERT INTO notes(user_id, deck_id, font, kind, point_id, content, prev_note_id)
                VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)
                RETURNING id, content, kind, point_id, prev_note_id, font";
    let note = sqlite::one(
        conn,
        stmt,
        params![
            &user_id,
            &deck_id,
            i32::from(font),
            &i32::from(kind),
            &point_id,
            &content,
            &prev_note_id
        ],
        note_from_row,
    )?;

    if let Some(next_note_id) = next_note_id {
        update_prev_note_id(conn, next_note_id, note.id)?;
    }

    Ok(note)
}

// note: this should be part of a transaction
//
pub(crate) fn create_note_deck_meta(
    tx: &Connection,
    user_id: Key,
    deck_id: Key,
) -> crate::Result<interop::Note> {
    create_common(
        tx,
        user_id,
        deck_id,
        Font::Serif,
        interop::NoteKind::NoteDeckMeta,
        None,
        "",
        None,
        None,
    )
}

pub(crate) fn create_notes(
    sqlite_pool: &SqlitePool,
    user_id: Key,
    note: &interop::ProtoNote,
) -> crate::Result<Vec<interop::Note>> {
    // let mut notes: Vec<interop::Note> = Vec::new();
    let mut conn = sqlite_pool.get()?;
    let tx = conn.transaction()?;

    let mut new_prev = note.prev_note_id;
    let next_note_id = note.next_note_id;

    if let Some(next_note_id) = next_note_id {
        // when the ProtoNote has a Some(next_note_id) then it can have a None for prev_note_id,
        // it's upto this code to get the correct prev_note_id
        new_prev = get_prev_note_id(sqlite_pool, next_note_id)?;
    }

    let mut it = note.content.iter().peekable();
    while let Some(content) = it.next() {
        if content.is_empty() {
            // this empty check was on the client side, moving it hear,
            // although not sure how often it's triggered
            //
            continue;
        }

        let new_note = create_common(
            &tx,
            user_id,
            note.deck_id,
            note.font,
            note.kind,
            note.point_id,
            content,
            new_prev,
            if it.peek().is_none() {
                next_note_id
            } else {
                None
            },
        )?;
        new_prev = Some(new_note.id);
        // notes.push(new_note);
    }

    tx.commit()?;

    let all_notes = all_from_deck(sqlite_pool, note.deck_id)?;
    Ok(all_notes)
}

fn update_prev_note_id(conn: &Connection, note_id: Key, prev_note_id: Key) -> crate::Result<()> {
    let stmt = "UPDATE notes
                SET prev_note_id = ?2
                WHERE id = ?1";
    sqlite::zero(conn, stmt, params![&note_id, &prev_note_id])
}

fn clear_prev_note_id(conn: &Connection, note_id: Key) -> crate::Result<()> {
    let stmt = "UPDATE notes
                SET prev_note_id = null
                WHERE id = ?1";
    sqlite::zero(conn, stmt, params![&note_id])
}

pub(crate) fn get_note(
    sqlite_pool: &SqlitePool,
    user_id: Key,
    note_id: Key,
) -> crate::Result<interop::Note> {
    let conn = sqlite_pool.get()?;
    get_note_(&conn, user_id, note_id)
}

fn get_note_(conn: &Connection, user_id: Key, note_id: Key) -> crate::Result<interop::Note> {
    let stmt = "SELECT n.id,
                       n.content,
                       n.kind,
                       n.point_id,
                       n.prev_note_id,
                       n.font
                FROM notes n
                WHERE n.id = ?1 AND n.user_id = ?2";
    sqlite::one(conn, stmt, params![&note_id, &user_id], note_from_row)
}
/*
pub(crate) fn get_note_notes(
    sqlite_pool: &SqlitePool,
    user_id: Key,
    deck_id: Key,
) -> crate::Result<Vec<interop::Note>> {
    let conn = sqlite_pool.get()?;

    let stmt = "SELECT n.id,
                       n.content,
                       n.kind,
                       n.point_id,
                       n.prev_note_id
                FROM notes n
                WHERE n.point_id is null
                      AND n.deck_id = ?1
                      AND n.user_id = ?2
                      AND n.kind=?3";

    let kind = interop::note_kind_to_sqlite(interop::NoteKind::Note);
    sqlite::many(
        &conn,
        stmt,
        params![&deck_id, &user_id, kind],
        note_from_row,
    )
}
*/
pub(crate) fn preview(
    sqlite_pool: &SqlitePool,
    user_id: Key,
    deck_id: Key,
) -> crate::Result<interop::PreviewNotes> {
    let conn = sqlite_pool.get()?;

    let stmt = "SELECT n.id,
                       n.content,
                       n.kind,
                       n.point_id,
                       n.prev_note_id,
                       n.font
                FROM notes n
                WHERE n.point_id is null AND n.deck_id = ?1 AND n.user_id = ?2";
    let notes = sqlite::many(&conn, stmt, params![&deck_id, &user_id], note_from_row)?;

    Ok(interop::PreviewNotes { deck_id, notes })
}

pub(crate) fn add_auto_summary(
    sqlite_pool: &SqlitePool,
    user_id: Key,
    deck_id: Key,
    prev_id: Option<Key>,
    summary: &str,
) -> crate::Result<interop::Note> {
    let conn = sqlite_pool.get()?;
    create_common(
        &conn,
        user_id,
        deck_id,
        Font::AI,
        interop::NoteKind::NoteSummary,
        None,
        summary,
        prev_id,
        None,
    )
}

pub fn edit_note(
    sqlite_pool: &SqlitePool,
    user_id: Key,
    note: &interop::Note,
    note_id: Key,
) -> crate::Result<interop::Note> {
    let conn = sqlite_pool.get()?;
    let stmt = "UPDATE notes
                SET content = ?3, font= ?4
                WHERE id = ?2 AND user_id = ?1
                RETURNING id, content, kind, point_id, prev_note_id, font";
    sqlite::one(
        &conn,
        stmt,
        params![&user_id, &note_id, &note.content, &i32::from(note.font)],
        note_from_row,
    )
}

pub fn get_all_notes_in_db(sqlite_pool: &SqlitePool) -> crate::Result<Vec<interop::Note>> {
    let conn = sqlite_pool.get()?;
    let stmt = "SELECT n.id,
                       n.content,
                       n.kind,
                       n.point_id,
                       n.prev_note_id,
                       n.font
                FROM   notes n
                ORDER BY n.id";
    sqlite::many(&conn, stmt, &[], note_from_row)
}

fn get_prev_note_id(sqlite_pool: &SqlitePool, id: Key) -> crate::Result<Option<Key>> {
    fn prev_id_from_row(row: &Row) -> crate::Result<Option<Key>> {
        Ok(row.get(0)?)
    }

    let conn = sqlite_pool.get()?;
    let stmt = "SELECT prev_note_id
                FROM   notes
                WHERE  id=?1";
    sqlite::one(&conn, stmt, &[&id], prev_id_from_row)
}
