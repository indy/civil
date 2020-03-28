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
use crate::persist::edges;
use bytes::{BufMut, BytesMut};
use deadpool_postgres::{Client, Pool, Transaction};
use serde::{Deserialize, Serialize};
use tokio_pg_mapper_derive::PostgresMapper;
use tokio_postgres::types::{to_sql_checked, IsNull, ToSql, Type};

#[allow(unused_imports)]
use tracing::info;

#[derive(Debug, Clone, Copy, PartialEq)]
pub enum NoteType {
    Note = 1,
    Quote = 2,
}

impl ToSql for NoteType {
    fn to_sql(
        &self,
        _ty: &Type,
        out: &mut BytesMut,
    ) -> ::std::result::Result<IsNull, Box<dyn ::std::error::Error + Sync + Send>> {
        out.put_i32(*self as i32);
        Ok(IsNull::No)
    }

    fn accepts(ty: &Type) -> bool {
        <i32 as ToSql>::accepts(ty)
    }

    to_sql_checked!();
}

#[derive(Debug, Deserialize, PostgresMapper, Serialize)]
#[pg_mapper(table = "notes")]
struct Note {
    id: Key,

    source: Option<String>,
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
            source: n.source,
            content: n.content,
            title: n.title,
            separator: n.separator,
        }
    }
}

pub(crate) async fn create_note(
    db_pool: &Pool,
    note: &interop::CreateNote,
    user_id: Key,
) -> Result<interop::Note> {
    let mut client: Client = db_pool.get().await.map_err(Error::DeadPool)?;
    let tx = client.transaction().await?;

    let res = create_common(
        &tx,
        note,
        user_id,
        NoteType::Note,
        note.title.as_ref(),
        &note.content[0],
        note.separator,
    )
    .await?;

    let iter = note.content.iter().skip(1);
    for content in iter {
        let _res = create_common(&tx, note, user_id, NoteType::Note, None, content, false).await?;
    }

    tx.commit().await?;

    Ok(res)
}

pub(crate) async fn get_note(db_pool: &Pool, note_id: Key, user_id: Key) -> Result<interop::Note> {
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
    note: &interop::Note,
    note_id: Key,
    user_id: Key,
) -> Result<interop::Note> {
    let res = edit_common(db_pool, note, note_id, user_id, NoteType::Note).await?;
    Ok(res)
}

pub(crate) async fn delete_note_pool(db_pool: &Pool, note_id: Key, user_id: Key) -> Result<()> {
    let mut client: Client = db_pool.get().await.map_err(Error::DeadPool)?;
    let tx = client.transaction().await?;

    edges::delete_all_edges_connected_with_note(&tx, note_id).await?;

    let stmt = include_str!("sql/notes_delete.sql");
    pg::zero(&tx, &stmt, &[&note_id, &user_id]).await?;

    tx.commit().await?;

    Ok(())
}

pub(crate) async fn delete_note(tx: &Transaction<'_>, note_id: Key, user_id: Key) -> Result<()> {
    edges::delete_all_edges_connected_with_note(&tx, note_id).await?;

    let stmt = include_str!("sql/notes_delete.sql");
    pg::zero(&tx, &stmt, &[&note_id, &user_id]).await?;

    Ok(())
}

pub(crate) async fn create_quote(
    db_pool: &Pool,
    note: &interop::CreateNote,
    user_id: Key,
) -> Result<interop::Note> {
    let mut client: Client = db_pool.get().await.map_err(Error::DeadPool)?;
    let tx = client.transaction().await?;

    let res = create_common(
        &tx,
        note,
        user_id,
        NoteType::Quote,
        None,
        &note.content[0],
        note.separator,
    )
    .await?;

    tx.commit().await?;

    Ok(res)
}

pub(crate) async fn edit_quote(
    db_pool: &Pool,
    note: &interop::Note,
    note_id: Key,
    user_id: Key,
) -> Result<interop::Note> {
    let res = edit_common(db_pool, note, note_id, user_id, NoteType::Quote).await?;
    Ok(res)
}

pub(crate) async fn create_common(
    tx: &Transaction<'_>,
    note: &interop::CreateNote,
    user_id: Key,
    note_type: NoteType,
    title: Option<&String>,
    content: &str,
    separator: bool,
) -> Result<interop::Note> {
    let db_note = pg::one::<Note>(
        tx,
        include_str!("sql/notes_create.sql"),
        &[
            &user_id,
            &note_type,
            &title,
            &note.source,
            &content,
            &separator,
        ],
    )
    .await?;

    let deck_id = if let Some(person_id) = note.person_id {
        person_id
    } else if let Some(subject_id) = note.subject_id {
        subject_id
    } else if let Some(article_id) = note.article_id {
        article_id
    } else if let Some(point_id) = note.point_id {
        point_id
    } else if let Some(book_id) = note.book_id {
        book_id
    } else {
        return Err(Error::Other);
    };

    edges::create_from_deck_to_note(tx, deck_id, db_note.id).await?;

    let note = interop::Note::from(db_note);
    Ok(note)
}

pub(crate) async fn edit_common(
    db_pool: &Pool,
    note: &interop::Note,
    note_id: Key,
    user_id: Key,
    note_type: NoteType,
) -> Result<interop::Note> {
    let db_note = pg::one_non_transactional::<Note>(
        db_pool,
        include_str!("sql/notes_edit.sql"),
        &[
            &user_id,
            &note_id,
            &note_type,
            &note.source,
            &note.content,
            &note.title,
            &note.separator,
        ],
    )
    .await?;

    let note = interop::Note::from(db_note);
    Ok(note)
}

pub(crate) async fn all_notes_for(
    db_pool: &Pool,
    deck_id: Key,
    note_type: NoteType,
) -> Result<Vec<interop::Note>> {
    pg::many_from::<Note, interop::Note>(
        db_pool,
        include_str!("sql/notes_all_for.sql"),
        &[&deck_id, &note_type],
    )
    .await
}

pub(crate) async fn delete_all_notes_connected_with_deck(
    tx: &Transaction<'_>,
    deck_id: Key,
    user_id: Key,
) -> Result<()> {
    let note_ids = pg::many::<NoteId>(
        tx,
        include_str!("sql/notes_all_ids_for_deck.sql"),
        &[&deck_id],
    )
    .await?;

    for note_id in note_ids {
        delete_note(tx, note_id.id, user_id).await?;
    }

    Ok(())
}
