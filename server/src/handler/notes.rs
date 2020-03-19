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

use crate::error::Result;
use crate::interop::IdParam;
use crate::session;
use actix_web::web::{Data, Json, Path};
use actix_web::HttpResponse;
use deadpool_postgres::Pool;

#[allow(unused_imports)]
use tracing::info;

pub mod interop {
    use crate::interop::Key;

    #[derive(Debug, serde::Deserialize, serde::Serialize)]
    pub struct Note {
        pub id: Key,
        pub source: Option<String>,
        pub content: String,
        pub annotation: Option<String>,
        pub separator: bool,
    }

    #[derive(Debug, serde::Deserialize, serde::Serialize)]
    pub struct CreateNote {
        pub source: Option<String>,
        pub content: Vec<String>,
        pub separator: bool,
        pub person_id: Option<Key>,
        pub subject_id: Option<Key>,
        pub article_id: Option<Key>,
        pub point_id: Option<Key>,
    }
}

pub async fn create_note(
    note: Json<interop::CreateNote>,
    db_pool: Data<Pool>,
    session: actix_session::Session,
) -> Result<HttpResponse> {
    let note = note.into_inner();
    info!("create_note {:?}", &note);

    let user_id = session::user_id(&session)?;

    let note = db::create_note(&db_pool, &note, user_id).await?;

    Ok(HttpResponse::Ok().json(note))
    //Ok(HttpResponse::Ok().json(true))
}

pub async fn get_note(
    db_pool: Data<Pool>,
    params: Path<IdParam>,
    session: actix_session::Session,
) -> Result<HttpResponse> {
    let user_id = session::user_id(&session)?;

    let note = db::get_note(&db_pool, params.id, user_id).await?;

    Ok(HttpResponse::Ok().json(note))
}

pub async fn edit_note(
    note: Json<interop::Note>,
    db_pool: Data<Pool>,
    params: Path<IdParam>,
    session: actix_session::Session,
) -> Result<HttpResponse> {
    let note = note.into_inner();
    let user_id = session::user_id(&session)?;

    let note = db::edit_note(&db_pool, &note, params.id, user_id).await?;

    Ok(HttpResponse::Ok().json(note))
}

pub async fn delete_note(
    db_pool: Data<Pool>,
    params: Path<IdParam>,
    session: actix_session::Session,
) -> Result<HttpResponse> {
    let user_id = session::user_id(&session)?;

    db::delete_note(&db_pool, params.id, user_id).await?;

    Ok(HttpResponse::Ok().json(true))
}

pub async fn create_quote(
    note: Json<interop::CreateNote>,
    db_pool: Data<Pool>,
    session: actix_session::Session,
) -> Result<HttpResponse> {
    let note = note.into_inner();
    let user_id = session::user_id(&session)?;

    let note = db::create_quote(&db_pool, &note, user_id).await?;

    Ok(HttpResponse::Ok().json(note))
}

pub async fn get_quote(
    db_pool: Data<Pool>,
    params: Path<IdParam>,
    session: actix_session::Session,
) -> Result<HttpResponse> {
    let user_id = session::user_id(&session)?;

    // same implementation as note
    let note = db::get_note(&db_pool, params.id, user_id).await?;

    Ok(HttpResponse::Ok().json(note))
}

pub async fn edit_quote(
    note: Json<interop::Note>,
    db_pool: Data<Pool>,
    params: Path<IdParam>,
    session: actix_session::Session,
) -> Result<HttpResponse> {
    let note = note.into_inner();
    let user_id = session::user_id(&session)?;

    let note = db::edit_quote(&db_pool, &note, params.id, user_id).await?;

    Ok(HttpResponse::Ok().json(note))
}

pub async fn delete_quote(
    db_pool: Data<Pool>,
    params: Path<IdParam>,
    session: actix_session::Session,
) -> Result<HttpResponse> {
    let user_id = session::user_id(&session)?;

    // same implementation as note
    db::delete_note(&db_pool, params.id, user_id).await?;

    Ok(HttpResponse::Ok().json(true))
}

pub mod db {
    use super::interop;
    use crate::error::{Error, Result};
    use crate::handler::edges;
    use crate::interop::Key;
    use crate::interop::Model;
    use crate::pg;
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
        annotation: Option<String>,
        separator: bool,
    }

    impl From<Note> for interop::Note {
        fn from(n: Note) -> interop::Note {
            interop::Note {
                id: n.id,
                source: n.source,
                content: n.content,
                annotation: n.annotation,
                separator: n.separator,
            }
        }
    }

    pub async fn create_note(
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
            &note.content[0],
            note.separator,
        )
        .await?;

        let iter = note.content.iter().skip(1);
        for content in iter {
            let _res = create_common(&tx, note, user_id, NoteType::Note, content, false).await?;
        }

        tx.commit().await?;

        Ok(res)
    }

    pub async fn get_note(db_pool: &Pool, note_id: Key, user_id: Key) -> Result<interop::Note> {
        let db_note = pg::one_non_transactional::<Note>(
            db_pool,
            include_str!("../sql/notes_get.sql"),
            &[&note_id, &user_id],
        )
        .await?;

        let note = interop::Note::from(db_note);
        Ok(note)
    }

    pub async fn edit_note(
        db_pool: &Pool,
        note: &interop::Note,
        note_id: Key,
        user_id: Key,
    ) -> Result<interop::Note> {
        let res = edit_common(db_pool, note, note_id, user_id, NoteType::Note).await?;
        Ok(res)
    }

    pub async fn delete_note(db_pool: &Pool, note_id: Key, user_id: Key) -> Result<()> {
        let mut client: Client = db_pool.get().await.map_err(Error::DeadPool)?;
        let tx = client.transaction().await?;

        edges::db::delete_all_edges_connected_with_note(&tx, note_id).await?;

        let stmt = include_str!("../sql/notes_delete.sql");
        pg::zero::<Note>(&tx, &stmt, &[&note_id, &user_id]).await?;

        tx.commit().await?;

        Ok(())
    }

    pub async fn create_quote(
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
            &note.content[0],
            note.separator,
        )
        .await?;

        tx.commit().await?;

        Ok(res)
    }

    pub async fn edit_quote(
        db_pool: &Pool,
        note: &interop::Note,
        note_id: Key,
        user_id: Key,
    ) -> Result<interop::Note> {
        let res = edit_common(db_pool, note, note_id, user_id, NoteType::Quote).await?;
        Ok(res)
    }

    pub async fn create_common(
        tx: &Transaction<'_>,
        note: &interop::CreateNote,
        user_id: Key,
        note_type: NoteType,
        content: &str,
        separator: bool,
    ) -> Result<interop::Note> {
        let db_note = pg::one::<Note>(
            tx,
            include_str!("../sql/notes_create.sql"),
            &[&user_id, &note_type, &note.source, &content, &separator],
        )
        .await?;

        if let Some(person_id) = note.person_id {
            let _ =
                edges::db::create_edge_to_note(tx, Model::HistoricPerson, person_id, db_note.id)
                    .await?;
        } else if let Some(subject_id) = note.subject_id {
            let _ =
                edges::db::create_edge_to_note(tx, Model::Subject, subject_id, db_note.id).await?;
        } else if let Some(article_id) = note.article_id {
            let _ =
                edges::db::create_edge_to_note(tx, Model::Article, article_id, db_note.id).await?;
        } else if let Some(point_id) = note.point_id {
            let _ = edges::db::create_edge_to_note(tx, Model::HistoricPoint, point_id, db_note.id)
                .await?;
        }

        let note = interop::Note::from(db_note);
        Ok(note)
    }

    pub async fn edit_common(
        db_pool: &Pool,
        note: &interop::Note,
        note_id: Key,
        user_id: Key,
        note_type: NoteType,
    ) -> Result<interop::Note> {
        let db_note = pg::one_non_transactional::<Note>(
            db_pool,
            include_str!("../sql/notes_edit.sql"),
            &[
                &user_id,
                &note_id,
                &note_type,
                &note.source,
                &note.content,
                &note.annotation,
                &note.separator,
            ],
        )
        .await?;

        let note = interop::Note::from(db_note);
        Ok(note)
    }

    pub async fn all_notes_for(
        db_pool: &Pool,
        deck_id: Key,
        note_type: NoteType,
    ) -> Result<Vec<interop::Note>> {
        pg::many_from::<Note, interop::Note>(
            db_pool,
            include_str!("../sql/notes_all_for.sql"),
            &[&deck_id, &note_type],
        )
        .await
    }

    pub async fn delete_all_notes_connected_with_deck(
        tx: &Transaction<'_>,
        deck_id: Key,
    ) -> Result<()> {
        let stmt = include_str!("../sql/notes_delete_deck.sql");
        pg::zero::<Note>(&tx, &stmt, &[&deck_id]).await?;
        Ok(())
    }
}
