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
use crate::handler::decks;
use crate::handler::notes;
use crate::interop::IdParam;
use crate::model::Model;
use crate::note_type::NoteType;
use crate::session;
use actix_web::web::{Data, Json, Path};
use actix_web::HttpResponse;
use deadpool_postgres::Pool;
use tracing::info;

pub mod interop {
    use crate::handler::decks::interop::DeckMention;
    use crate::handler::decks::interop::DeckReference;
    use crate::handler::notes::interop::Note;
    use crate::interop::Key;

    #[derive(Debug, serde::Deserialize, serde::Serialize)]
    pub struct Subject {
        pub id: Key,
        pub name: String,

        pub notes: Option<Vec<Note>>,
        pub quotes: Option<Vec<Note>>,

        pub people_referenced: Option<Vec<DeckReference>>,
        pub subjects_referenced: Option<Vec<DeckReference>>,

        pub mentioned_by_people: Option<Vec<DeckMention>>,
        pub mentioned_in_subjects: Option<Vec<DeckMention>>,
        pub mentioned_in_articles: Option<Vec<DeckMention>>,
    }

    #[derive(Debug, serde::Deserialize, serde::Serialize)]
    pub struct CreateSubject {
        pub name: String,
    }
}

pub async fn create_subject(
    subject: Json<interop::CreateSubject>,
    db_pool: Data<Pool>,
    session: actix_session::Session,
) -> Result<HttpResponse> {
    info!("create_subject");

    let subject = subject.into_inner();
    let user_id = session::user_id(&session)?;

    let subject = db::create(&db_pool, &subject, user_id).await?;

    Ok(HttpResponse::Ok().json(subject))
}

pub async fn get_subjects(
    db_pool: Data<Pool>,
    session: actix_session::Session,
) -> Result<HttpResponse> {
    info!("get_subjects");
    let user_id = session::user_id(&session)?;
    // db statement
    let subjects = db::all(&db_pool, user_id).await?;

    Ok(HttpResponse::Ok().json(subjects))
}

pub async fn get_subject(
    db_pool: Data<Pool>,
    params: Path<IdParam>,
    session: actix_session::Session,
) -> Result<HttpResponse> {
    info!("get_subject {:?}", params.id);
    let user_id = session::user_id(&session)?;

    // db statements
    let subject_id = params.id;
    let mut subject = db::get(&db_pool, subject_id, user_id).await?;

    let notes = notes::db::all_notes_for(&db_pool, subject_id, NoteType::Note).await?;
    subject.notes = Some(notes);

    let quotes = notes::db::all_notes_for(&db_pool, subject_id, NoteType::Quote).await?;
    subject.quotes = Some(quotes);

    let people_referenced =
        decks::db::referenced_in(&db_pool, Model::Subject, subject_id, Model::HistoricPerson)
            .await?;
    subject.people_referenced = Some(people_referenced);

    let subjects_referenced =
        decks::db::referenced_in(&db_pool, Model::Subject, subject_id, Model::Subject).await?;
    subject.subjects_referenced = Some(subjects_referenced);

    // all the people that mention this subject
    let mentioned_by_people =
        decks::db::that_mention(&db_pool, Model::HistoricPerson, Model::Subject, subject_id)
            .await?;
    subject.mentioned_by_people = Some(mentioned_by_people);

    // all the subjects that mention this subject
    let mentioned_in_subjects =
        decks::db::that_mention(&db_pool, Model::Subject, Model::Subject, subject_id).await?;
    subject.mentioned_in_subjects = Some(mentioned_in_subjects);

    // all the articles that mention this subject
    let mentioned_in_articles =
        decks::db::that_mention(&db_pool, Model::Article, Model::Subject, subject_id).await?;
    subject.mentioned_in_articles = Some(mentioned_in_articles);

    Ok(HttpResponse::Ok().json(subject))
}

pub async fn edit_subject(
    subject: Json<interop::Subject>,
    db_pool: Data<Pool>,
    params: Path<IdParam>,
    session: actix_session::Session,
) -> Result<HttpResponse> {
    let subject = subject.into_inner();
    let user_id = session::user_id(&session)?;

    let subject = db::edit(&db_pool, &subject, params.id, user_id).await?;

    Ok(HttpResponse::Ok().json(subject))
}

pub async fn delete_subject(
    db_pool: Data<Pool>,
    params: Path<IdParam>,
    session: actix_session::Session,
) -> Result<HttpResponse> {
    let user_id = session::user_id(&session)?;

    db::delete(&db_pool, params.id, user_id).await?;

    Ok(HttpResponse::Ok().json(true))
}

pub mod db {
    use super::interop;
    use crate::error::Result;
    use crate::handler::decks;
    use crate::interop::Key;
    use crate::pg;
    use deadpool_postgres::Pool;
    use serde::{Deserialize, Serialize};
    use tokio_pg_mapper_derive::PostgresMapper;
    #[allow(unused_imports)]
    use tracing::info;

    #[derive(Debug, Clone, Serialize, Deserialize, PostgresMapper)]
    #[pg_mapper(table = "decks")]
    struct Subject {
        id: Key,
        name: String,
    }

    impl From<Subject> for interop::Subject {
        fn from(s: Subject) -> interop::Subject {
            interop::Subject {
                id: s.id,
                name: s.name,

                notes: None,
                quotes: None,

                people_referenced: None,
                subjects_referenced: None,

                mentioned_by_people: None,
                mentioned_in_subjects: None,
                mentioned_in_articles: None,
            }
        }
    }

    pub async fn all(db_pool: &Pool, user_id: Key) -> Result<Vec<interop::Subject>> {
        pg::many_from::<Subject, interop::Subject>(
            db_pool,
            include_str!("../sql/subjects_all.sql"),
            &[&user_id],
        )
        .await
    }

    pub async fn get(db_pool: &Pool, subject_id: Key, user_id: Key) -> Result<interop::Subject> {
        pg::one_from::<Subject, interop::Subject>(
            db_pool,
            include_str!("../sql/subjects_get.sql"),
            &[&user_id, &subject_id],
        )
        .await
    }

    pub async fn create(
        db_pool: &Pool,
        subject: &interop::CreateSubject,
        user_id: Key,
    ) -> Result<interop::Subject> {
        pg::one_from::<Subject, interop::Subject>(
            db_pool,
            include_str!("../sql/subjects_create.sql"),
            &[&user_id, &subject.name],
        )
        .await
    }

    pub async fn edit(
        db_pool: &Pool,
        subject: &interop::Subject,
        subject_id: Key,
        user_id: Key,
    ) -> Result<interop::Subject> {
        pg::one_from::<Subject, interop::Subject>(
            db_pool,
            include_str!("../sql/subjects_edit.sql"),
            &[&user_id, &subject_id, &subject.name],
        )
        .await
    }

    pub async fn delete(db_pool: &Pool, subject_id: Key, user_id: Key) -> Result<()> {
        decks::db::delete(db_pool, subject_id, user_id).await
    }
}
