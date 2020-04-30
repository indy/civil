// Copyright (C) 2020 Inderjit Gill <email@indy.io>

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
    title: Option<String>,
    separator: bool,
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
            title: n.title,
            separator: n.separator,
        }
    }
}

pub(crate) async fn create_notes(
    db_pool: &Pool,
    user_id: Key,
    note: &interop::CreateNote,
) -> Result<Vec<interop::Note>> {
    let mut client: Client = db_pool.get().await.map_err(Error::DeadPool)?;
    let tx = client.transaction().await?;

    let mut notes: Vec<interop::Note> = Vec::new();

    let res = create_common(
        &tx,
        user_id,
        note.deck_id,
        note.title.as_ref(),
        &note.content[0],
        note.separator,
    )
    .await?;

    notes.push(res);

    let iter = note.content.iter().skip(1);
    for content in iter {
        let res = create_common(&tx, user_id, note.deck_id, None, content, false).await?;
        notes.push(res);
    }

    tx.commit().await?;

    Ok(notes)
}

pub(crate) async fn get_note(db_pool: &Pool, user_id: Key, note_id: Key) -> Result<interop::Note> {
    let db_note = pg::one_non_transactional::<Note>(
        db_pool,
        include_str!("sql/notes_get.sql"),
        &[&note_id, &user_id],
    )
    .await?;

    let note = interop::Note::from(db_note);
    Ok(note)
}

pub(crate) async fn edit_note(
    db_pool: &Pool,
    user_id: Key,
    note: &interop::Note,
    note_id: Key,
) -> Result<interop::Note> {
    let db_note = pg::one_non_transactional::<Note>(
        db_pool,
        include_str!("sql/notes_edit.sql"),
        &[
            &user_id,
            &note_id,
            &note.content,
            &note.title,
            &note.separator,
        ],
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
        &include_str!("sql/edges_delete_notes_decks_with_note_id.sql"),
        &[&note_id],
    )
    .await?;

    let stmt = include_str!("sql/notes_delete.sql");
    pg::zero(&tx, &stmt, &[&note_id, &user_id]).await?;

    Ok(())
}

pub(crate) async fn create_common(
    tx: &Transaction<'_>,
    user_id: Key,
    deck_id: Key,
    title: Option<&String>,
    content: &str,
    separator: bool,
) -> Result<interop::Note> {
    let db_note = pg::one::<Note>(
        tx,
        include_str!("sql/notes_create.sql"),
        &[&user_id, &deck_id, &title, &content, &separator],
    )
    .await?;

    let note = interop::Note::from(db_note);
    Ok(note)
}

pub(crate) async fn all_from_deck(db_pool: &Pool, deck_id: Key) -> Result<Vec<interop::Note>> {
    pg::many_from::<Note, interop::Note>(
        db_pool,
        include_str!("sql/notes_all_from_deck.sql"),
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
        include_str!("sql/notes_all_ids_for_deck.sql"),
        &[&deck_id],
    )
    .await?;

    for note_id in note_ids {
        delete_note(tx, user_id, note_id.id).await?;
    }

    Ok(())
}
