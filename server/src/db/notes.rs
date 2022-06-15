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
use crate::db::note_kind::NoteKind;
use crate::error::{Error, Result};
use crate::interop::notes as interop;
use crate::interop::Key;
use deadpool_postgres::Pool;
use serde::{Deserialize, Serialize};
use tokio_pg_mapper_derive::PostgresMapper;

#[allow(unused_imports)]
use tracing::info;

#[derive(Debug, Deserialize, PostgresMapper, Serialize)]
#[pg_mapper(table = "notes")]
pub struct Note {
    id: Key,
    kind: NoteKind,
    content: String,
    point_id: Option<Key>,
}

#[derive(Debug, Deserialize, PostgresMapper, Serialize)]
#[pg_mapper(table = "notes")]
pub struct NoteId {
    pub id: Key,
}

impl From<Note> for interop::Note {
    fn from(n: Note) -> interop::Note {
        interop::Note {
            id: n.id,
            kind: interop::NoteKind::from(n.kind),
            content: n.content,
            point_id: n.point_id,
        }
    }
}

// NoteBasic is a note where the point_id is assumed to be None
// only used by get_note
#[derive(Debug, Deserialize, PostgresMapper, Serialize)]
#[pg_mapper(table = "notes")]
struct NoteBasic {
    id: Key,
    content: String,
    kind: NoteKind,
}

impl From<NoteBasic> for interop::Note {
    fn from(n: NoteBasic) -> interop::Note {
        interop::Note {
            id: n.id,
            kind: interop::NoteKind::from(n.kind),
            content: n.content,
            point_id: None,
        }
    }
}

pub async fn get_all_notes_in_db(db_pool: &Pool) -> Result<Vec<interop::Note>> {
    pg::many_from::<Note, interop::Note>(
        db_pool,
        "SELECT n.id,
                n.content,
                n.kind,
                n.point_id
         FROM   notes n
         ORDER BY n.id",
        &[],
    )
    .await
}

use crate::db::sqlite::{self, SqlitePool};
use rusqlite::{Connection, Row, params};

pub(crate) fn note_kind_from_sqlite_string(s: String) -> Result<interop::NoteKind> {
    if s == "note" {
        Ok(interop::NoteKind::Note)
    } else if s == "note_review" {
        Ok(interop::NoteKind::NoteReview)
    } else if s == "note_summary" {
        Ok(interop::NoteKind::NoteSummary)
    } else {
        Err(Error::SqliteStringConversion)
    }
}

fn sqlite_note_from_row(row: &Row) -> Result<interop::Note> {
    Ok(interop::Note {
        id: row.get(0)?,
        kind: note_kind_from_sqlite_string(row.get(2)?)?,
        content: row.get(1)?,
        point_id: row.get(3)?,
    })
}

pub(crate) fn sqlite_all_from_deck(sqlite_pool: &SqlitePool, deck_id: Key) -> Result<Vec<interop::Note>> {

    let conn = sqlite_pool.get()?;

    sqlite::many(&conn,
                 "SELECT n.id,
                         n.content,
                         n.kind,
                         n.point_id
                  FROM   notes n
                  WHERE  n.deck_id = ?1
                  ORDER BY n.id",
                 params!(&deck_id),
                 sqlite_note_from_row)
}

pub(crate) fn sqlite_delete_note(conn: &Connection, user_id: Key, note_id: Key) -> Result<()> {
    sqlite::zero(&conn,
                 "DELETE FROM notes_decks
                  WHERE   note_id = ?1",
                 params![&note_id])?;

    sqlite::zero(&conn,
                 "DELETE FROM notes
                  WHERE   id = ?1 AND user_id = ?2",
                 params![&note_id, &user_id])?;

    Ok(())
}

pub(crate) fn sqlite_delete_note_pool(sqlite_pool: &SqlitePool, user_id: Key, note_id: Key) -> Result<()> {
    let conn = sqlite_pool.get()?;
    sqlite_delete_note(&conn, user_id, note_id)
}

pub(crate) fn sqlite_delete_all_notes_connected_with_deck(
    conn: &Connection,
    user_id: Key,
    deck_id: Key,
) -> Result<()> {

    fn id_from_row(row: &Row) -> Result<Key> {
        Ok(row.get(0)?)
    }

    let note_ids: Vec<Key> = sqlite::many(&conn,
                                "SELECT n.id
                                 FROM   notes n
                                 WHERE  n.deck_id = ?1",
                                params![&deck_id],
                                id_from_row)?;

    for note_id in note_ids {
        sqlite_delete_note(&conn, user_id, note_id)?;
    }

    Ok(())
}

pub(crate) fn sqlite_create_common(
    conn: &Connection,
    user_id: Key,
    deck_id: Key,
    kind: interop::NoteKind,
    point_id: Option<Key>,
    content: &str,
) -> Result<interop::Note> {

    let k = interop::note_kind_to_sqlite_string(kind)?;

    sqlite::one(&conn,
                "INSERT INTO notes(user_id, deck_id, kind, point_id, content)
                 VALUES (?1, ?2, ?3, ?4, ?5)
                 RETURNING id, content, kind, point_id",
                params![&user_id, &deck_id, &k, &point_id, &content],
                sqlite_note_from_row)
}

pub(crate) fn sqlite_create_notes(
    sqlite_pool: &SqlitePool,
    user_id: Key,
    note: &interop::ProtoNote,
) -> Result<Vec<interop::Note>> {
    let mut notes: Vec<interop::Note> = Vec::new();
    let conn = sqlite_pool.get()?;

    for content in note.content.iter() {
        notes.push(
            sqlite_create_common(
                &conn,
                user_id,
                note.deck_id,
                note.kind,
                note.point_id,
                content,
            )?
        );
    }

    Ok(notes)
}

pub(crate) fn sqlite_get_note(sqlite_pool: &SqlitePool, user_id: Key, note_id: Key) -> Result<interop::Note> {
    fn sqlite_note_from_row(row: &Row) -> Result<interop::Note> {
        Ok(interop::Note {
            id: row.get(0)?,
            kind: note_kind_from_sqlite_string(row.get(2)?)?,
            content: row.get(1)?,
            point_id: None,
        })
    }

    let conn = sqlite_pool.get()?;
    sqlite::one(&conn,
                "SELECT n.id,
                        n.content,
                        n.kind
                 FROM notes n
                 WHERE n.id = ?1 AND n.user_id = ?2",
                params![&note_id, &user_id],
                sqlite_note_from_row)
}

pub(crate) fn sqlite_edit_note(
    sqlite_pool: &SqlitePool,
    user_id: Key,
    note: &interop::Note,
    note_id: Key,
) -> Result<interop::Note> {
    let conn = sqlite_pool.get()?;

    sqlite::one(&conn,
                "UPDATE notes
                 SET content = ?3
                 WHERE id = ?2 and user_id = ?1
                 RETURNING id, content, kind, point_id",
                params![&user_id, &note_id, &note.content],
                sqlite_note_from_row)
}
