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
use crate::error::{Error, Result};
use crate::interop::notes as interop;
use crate::interop::Key;
use deadpool_postgres::{Client, Pool, Transaction};
use serde::{Deserialize, Serialize};
use tokio_pg_mapper_derive::PostgresMapper;

#[allow(unused_imports)]
use tracing::info;

#[derive(Debug, Deserialize, PostgresMapper, Serialize)]
#[pg_mapper(table = "notes")]
struct Note {
    id: Key,
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
            content: n.content,
            point_id: n.point_id,
        }
    }
}

pub(crate) async fn create_notes(
    db_pool: &Pool,
    user_id: Key,
    note: &interop::ProtoNote,
) -> Result<Vec<interop::Note>> {
    let mut notes: Vec<interop::Note> = Vec::new();

    let mut client: Client = db_pool.get().await.map_err(Error::DeadPool)?;
    let tx = client.transaction().await?;

    for content in note.content.iter() {
        notes.push(create_common(&tx, user_id, note.deck_id, note.point_id, content).await?);
    }

    tx.commit().await?;

    Ok(notes)
}

// NoteBasic is a note where the point_id is assumed to be None
// only used by get_note
#[derive(Debug, Deserialize, PostgresMapper, Serialize)]
#[pg_mapper(table = "notes")]
struct NoteBasic {
    id: Key,
    content: String,
}

impl From<NoteBasic> for interop::Note {
    fn from(n: NoteBasic) -> interop::Note {
        interop::Note {
            id: n.id,
            content: n.content,
            point_id: None,
        }
    }
}

pub(crate) async fn get_note(db_pool: &Pool, user_id: Key, note_id: Key) -> Result<interop::Note> {
    let db_note = pg::one_non_transactional::<NoteBasic>(
        db_pool,
        "SELECT n.id,
                n.content
         FROM notes n
         WHERE n.id = $1 AND n.user_id = $2",
        &[&note_id, &user_id],
    )
    .await?;

    Ok(db_note.into())
}

pub(crate) async fn edit_note(
    db_pool: &Pool,
    user_id: Key,
    note: &interop::Note,
    note_id: Key,
) -> Result<interop::Note> {
    let db_note = pg::one_non_transactional::<Note>(
        db_pool,
        "UPDATE notes
         SET content = $3
         WHERE id = $2 and user_id = $1
         RETURNING $table_fields",
        &[&user_id, &note_id, &note.content],
    )
    .await?;

    let note = interop::Note::from(db_note);
    Ok(note)
}

pub(crate) async fn delete_note_pool(db_pool: &Pool, user_id: Key, note_id: Key) -> Result<()> {
    let mut client: Client = db_pool.get().await.map_err(Error::DeadPool)?;
    let tx = client.transaction().await?;

    delete_note(&tx, user_id, note_id).await?;

    tx.commit().await?;

    Ok(())
}

pub(crate) async fn delete_note(tx: &Transaction<'_>, user_id: Key, note_id: Key) -> Result<()> {
    pg::zero(
        tx,
        "DELETE FROM notes_decks
         WHERE   note_id = $1",
        &[&note_id],
    )
    .await?;

    pg::zero(
        &tx,
        "DELETE FROM notes
              WHERE id = $1 AND user_id = $2",
        &[&note_id, &user_id],
    )
    .await?;

    Ok(())
}

pub(crate) async fn create_common(
    tx: &Transaction<'_>,
    user_id: Key,
    deck_id: Key,
    point_id: Option<Key>,
    content: &str,
) -> Result<interop::Note> {
    let db_note = pg::one::<Note>(
        tx,
        "INSERT INTO notes(user_id, deck_id, point_id, content)
         VALUES ($1, $2, $3, $4)
         RETURNING $table_fields",
        &[&user_id, &deck_id, &point_id, &content],
    )
    .await?;

    let note = interop::Note::from(db_note);
    Ok(note)
}

pub(crate) async fn all_from_deck(db_pool: &Pool, deck_id: Key) -> Result<Vec<interop::Note>> {
    pg::many_from::<Note, interop::Note>(
        db_pool,
        "SELECT n.id,
                n.content,
                n.point_id
         FROM   notes n
         WHERE  n.deck_id = $1
         ORDER BY n.id",
        &[&deck_id],
    )
    .await
}

pub(crate) async fn delete_all_notes_connected_with_deck(
    tx: &Transaction<'_>,
    user_id: Key,
    deck_id: Key,
) -> Result<()> {
    let note_ids = pg::many::<NoteId>(
        tx,
        "SELECT n.id
         FROM   notes n
         WHERE  n.deck_id = $1",
        &[&deck_id],
    )
    .await?;

    for note_id in note_ids {
        delete_note(tx, user_id, note_id.id).await?;
    }

    Ok(())
}

pub async fn get_all_notes_in_db(db_pool: &Pool) -> Result<Vec<interop::Note>> {
    pg::many_from::<Note, interop::Note>(
        db_pool,
        "SELECT n.id,
                n.content,
                n.point_id
         FROM   notes n
         ORDER BY n.id",
        &[],
    )
    .await
}
