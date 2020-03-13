// Copyright (C) 2020 Inderjit Gill <email@indy.io>

// This program is free software: you can redistribute it and/or modify
// it under the terms of the GNU Affero General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.

// This program is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
// GNU Affero General Public License for more details.

// You should have received a copy of the GNU Affero General Public License
// along with this program.  If not, see <https://www.gnu.org/licenses/>.


use crate::error::Result;
use crate::interop::{IdParam, Key};
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
        pub content: String,
        pub annotation: Option<String>,
        pub separator: bool,
    }
}

pub async fn create_note(
    note: Json<interop::CreateNote>,
    db_pool: Data<Pool>,
    _session: actix_session::Session,
) -> Result<HttpResponse> {
    let note = note.into_inner();
    // let user_id = session::user_id(&session)?;
    let user_id: Key = 1;

    let note = db::create_note(&db_pool, &note, user_id).await?;

    Ok(HttpResponse::Ok().json(note))
}

pub async fn get_note(
    db_pool: Data<Pool>,
    params: Path<IdParam>,
    _session: actix_session::Session,
) -> Result<HttpResponse> {
    // let user_id = session::user_id(&session)?;
    let user_id: Key = 1;

    let note = db::get_note(&db_pool, params.id, user_id).await?;

    Ok(HttpResponse::Ok().json(note))
}

pub async fn edit_note(
    note: Json<interop::Note>,
    db_pool: Data<Pool>,
    params: Path<IdParam>,
    _session: actix_session::Session,
) -> Result<HttpResponse> {
    let note = note.into_inner();
    // let user_id = session::user_id(&session)?;
    let user_id: Key = 1;

    let note = db::edit_note(&db_pool, &note, params.id, user_id).await?;

    Ok(HttpResponse::Ok().json(note))
}

pub async fn delete_note(
    db_pool: Data<Pool>,
    params: Path<IdParam>,
    _session: actix_session::Session,
) -> Result<HttpResponse> {
    // let user_id = session::user_id(&session)?;
    let user_id: Key = 1;

    db::delete_note(&db_pool, params.id, user_id).await?;

    Ok(HttpResponse::Ok().json(true))
}


pub async fn create_quote(
    note: Json<interop::CreateNote>,
    db_pool: Data<Pool>,
    _session: actix_session::Session,
) -> Result<HttpResponse> {
    let note = note.into_inner();
    // let user_id = session::user_id(&session)?;
    let user_id: Key = 1;

    let note = db::create_quote(&db_pool, &note, user_id).await?;

    Ok(HttpResponse::Ok().json(note))
}

pub async fn get_quote(
    db_pool: Data<Pool>,
    params: Path<IdParam>,
    _session: actix_session::Session,
) -> Result<HttpResponse> {
    // let user_id = session::user_id(&session)?;
    let user_id: Key = 1;

    // same implementation as note
    let note = db::get_note(&db_pool, params.id, user_id).await?;

    Ok(HttpResponse::Ok().json(note))
}

pub async fn edit_quote(
    note: Json<interop::Note>,
    db_pool: Data<Pool>,
    params: Path<IdParam>,
    _session: actix_session::Session,
) -> Result<HttpResponse> {
    let note = note.into_inner();
    // let user_id = session::user_id(&session)?;
    let user_id: Key = 1;

    let note = db::edit_quote(&db_pool, &note, params.id, user_id).await?;

    Ok(HttpResponse::Ok().json(note))
}

pub async fn delete_quote(
    db_pool: Data<Pool>,
    params: Path<IdParam>,
    _session: actix_session::Session,
) -> Result<HttpResponse> {
    // let user_id = session::user_id(&session)?;
    let user_id: Key = 1;

    // same implementation as note
    db::delete_note(&db_pool, params.id, user_id).await?;

    Ok(HttpResponse::Ok().json(true))
}


pub mod db {
    use super::interop;
    use crate::edge_type;
    use crate::error::Result;
    use crate::interop::Key;
    use crate::model::{model_to_foreign_key, Model};
    use crate::note_type::NoteType;
    use crate::pg;
    use deadpool_postgres::Pool;
    use serde::{Deserialize, Serialize};
    use tokio_pg_mapper_derive::PostgresMapper;
    #[allow(unused_imports)]
    use tracing::info;

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
        let res = create_common(db_pool, note, user_id, NoteType::Note).await?;
        Ok(res)
    }

    pub async fn get_note(db_pool: &Pool, note_id: Key, user_id: Key) -> Result<interop::Note> {
        let db_note = pg::one::<Note>(
            db_pool,
            include_str!("sql/notes_get.sql"),
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
        pg::delete_owned_by_user::<Note>(db_pool, note_id, user_id, Model::Note).await?;
        Ok(())
    }

    pub async fn create_quote(
        db_pool: &Pool,
        note: &interop::CreateNote,
        user_id: Key,
    ) -> Result<interop::Note> {
        let res = create_common(db_pool, note, user_id, NoteType::Quote).await?;
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
        db_pool: &Pool,
        note: &interop::CreateNote,
        user_id: Key,
        note_type: NoteType,
    ) -> Result<interop::Note> {
        let db_note = pg::one::<Note>(
            db_pool,
            include_str!("sql/notes_create.sql"),
            &[
                &user_id,
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

    pub async fn edit_common(
        db_pool: &Pool,
        note: &interop::Note,
        note_id: Key,
        user_id: Key,
        note_type: NoteType,
    ) -> Result<interop::Note> {
        let db_note = pg::one::<Note>(
            db_pool,
            include_str!("sql/notes_edit.sql"),
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
        model: Model,
        id: Key,
        note_type: NoteType,
    ) -> Result<Vec<interop::Note>> {
        let e1 = edge_type::model_to_note(model)?;
        let foreign_key = model_to_foreign_key(model);

        let stmt = include_str!("sql/notes_all_for.sql");
        let stmt = stmt.replace("$foreign_key", foreign_key);

        let db_notes = pg::many::<Note>(db_pool, &stmt, &[&id, &e1, &note_type]).await?;

        let notes = db_notes.into_iter().map(|n| interop::Note::from(n)).collect();

        Ok(notes)
    }

    pub async fn delete_all_notes_for(db_pool: &Pool, model: Model, id: Key) -> Result<()> {
        let foreign_key = model_to_foreign_key(model);

        let stmt = include_str!("sql/notes_delete.sql");
        let stmt = stmt.replace("$foreign_key", foreign_key);

        pg::zero::<Note>(db_pool, &stmt, &[&id]).await?;
        Ok(())
    }
}
