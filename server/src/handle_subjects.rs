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
use crate::handle_articles;
use crate::handle_historic_people;
use crate::handle_notes;
use crate::interop::IdParam;
use crate::model::Model;
use crate::note_type::NoteType;
use crate::session;
use actix_web::web::{Data, Json, Path};
use actix_web::HttpResponse;
use deadpool_postgres::Pool;
use tracing::info;

pub mod interop {
    use crate::handle_articles::interop::ArticleMention;
    use crate::handle_historic_people::interop::{PersonMention, PersonReference};
    use crate::handle_notes::interop::Note;
    use crate::interop::Key;

    #[derive(Debug, serde::Deserialize, serde::Serialize)]
    pub struct Subject {
        pub id: Key,
        pub name: String,

        pub notes: Option<Vec<Note>>,
        pub quotes: Option<Vec<Note>>,

        pub people_referenced: Option<Vec<PersonReference>>,
        pub subjects_referenced: Option<Vec<SubjectReference>>,

        pub mentioned_by_people: Option<Vec<PersonMention>>,
        pub mentioned_in_subjects: Option<Vec<SubjectMention>>,
        pub mentioned_in_articles: Option<Vec<ArticleMention>>,
    }

    #[derive(Debug, serde::Deserialize, serde::Serialize)]
    pub struct CreateSubject {
        pub name: String,
    }

    #[derive(Debug, serde::Deserialize, serde::Serialize)]
    pub struct SubjectReference {
        pub note_id: Key,
        pub subject_id: Key,
        pub subject_name: String,
    }

    #[derive(Debug, serde::Deserialize, serde::Serialize)]
    pub struct SubjectMention {
        pub subject_id: Key,
        pub subject_name: String,
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

    let subject = db::create_subject(&db_pool, &subject, user_id).await?;

    Ok(HttpResponse::Ok().json(subject))
}

pub async fn get_subjects(
    db_pool: Data<Pool>,
    session: actix_session::Session,
) -> Result<HttpResponse> {
    info!("get_subjects");
    let user_id = session::user_id(&session)?;
    // db statement
    let subjects = db::get_subjects(&db_pool, user_id).await?;

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
    let mut subject = db::get_subject(&db_pool, subject_id, user_id).await?;

    let notes =
        handle_notes::db::all_notes_for(&db_pool, Model::Subject, subject_id, NoteType::Note)
            .await?;
    subject.notes = Some(notes);

    let quotes =
        handle_notes::db::all_notes_for(&db_pool, Model::Subject, subject_id, NoteType::Quote)
            .await?;
    subject.quotes = Some(quotes);

    let people_referenced =
        handle_historic_people::db::get_people_referenced(&db_pool, Model::Subject, subject_id)
            .await?;
    subject.people_referenced = Some(people_referenced);

    let subjects_referenced =
        db::get_subjects_referenced(&db_pool, Model::Subject, subject_id).await?;
    subject.subjects_referenced = Some(subjects_referenced);

    let mentioned_by_people =
        handle_historic_people::db::people_that_mention(&db_pool, Model::Subject, subject_id)
            .await?;
    subject.mentioned_by_people = Some(mentioned_by_people);

    let mentioned_in_subjects =
        db::subjects_that_mention(&db_pool, Model::Subject, subject_id).await?;
    subject.mentioned_in_subjects = Some(mentioned_in_subjects);

    let mentioned_in_articles =
        handle_articles::db::articles_that_mention(&db_pool, Model::Subject, subject_id).await?;
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

    let subject = db::edit_subject(&db_pool, &subject, params.id, user_id).await?;

    Ok(HttpResponse::Ok().json(subject))
}

pub async fn delete_subject(
    db_pool: Data<Pool>,
    params: Path<IdParam>,
    session: actix_session::Session,
) -> Result<HttpResponse> {
    let user_id = session::user_id(&session)?;

    db::delete_subject(&db_pool, params.id, user_id).await?;

    Ok(HttpResponse::Ok().json(true))
}

pub mod db {
    use super::interop;
    use crate::edge_type::{self, EdgeType};
    use crate::error::{Error, Result};
    use crate::handle_edges;
    use crate::handle_notes;
    use crate::interop::Key;
    use crate::model::{model_to_foreign_key, Model};
    use crate::pg;
    use deadpool_postgres::{Client, Pool};
    use serde::{Deserialize, Serialize};
    use tokio_pg_mapper_derive::PostgresMapper;
    #[allow(unused_imports)]
    use tracing::info;

    #[derive(Debug, Clone, Serialize, Deserialize, PostgresMapper)]
    #[pg_mapper(table = "subjects")]
    struct Subject {
        id: Key,
        name: String,
    }

    #[derive(Debug, Clone, Serialize, Deserialize, PostgresMapper)]
    #[pg_mapper(table = "subjects")]
    struct SubjectReference {
        note_id: Key,
        subject_id: Key,
        subject_name: String,
    }

    #[derive(Debug, Clone, Serialize, Deserialize, PostgresMapper)]
    #[pg_mapper(table = "subjects")]
    struct SubjectMention {
        subject_id: Key,
        subject_name: String,
    }

    // todo: should this from impl be in interop???
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

    impl From<&SubjectReference> for interop::SubjectReference {
        fn from(s: &SubjectReference) -> interop::SubjectReference {
            interop::SubjectReference {
                note_id: s.note_id,
                subject_id: s.subject_id,
                subject_name: s.subject_name.to_string(),
            }
        }
    }

    impl From<&SubjectMention> for interop::SubjectMention {
        fn from(sm: &SubjectMention) -> interop::SubjectMention {
            interop::SubjectMention {
                subject_id: sm.subject_id,
                subject_name: sm.subject_name.to_string(),
            }
        }
    }

    pub async fn get_subjects(db_pool: &Pool, user_id: Key) -> Result<Vec<interop::Subject>> {
        let db_subjects = pg::many_non_transactional::<Subject>(
            db_pool,
            include_str!("sql/subjects_all.sql"),
            &[&user_id],
        )
        .await?;

        let subjects: Vec<interop::Subject> = db_subjects
            .into_iter()
            .map(|db_subject| interop::Subject::from(db_subject))
            .collect();

        Ok(subjects)
    }

    pub async fn get_subject(
        db_pool: &Pool,
        subject_id: Key,
        user_id: Key,
    ) -> Result<interop::Subject> {
        let db_subject = pg::one_non_transactional::<Subject>(
            db_pool,
            include_str!("sql/subjects_get.sql"),
            &[&subject_id, &user_id],
        )
        .await?;

        let subject = interop::Subject::from(db_subject);

        Ok(subject)
    }

    pub async fn create_subject(
        db_pool: &Pool,
        subject: &interop::CreateSubject,
        user_id: Key,
    ) -> Result<interop::Subject> {
        let db_subject = pg::one_non_transactional::<Subject>(
            db_pool,
            include_str!("sql/subjects_create.sql"),
            &[&user_id, &subject.name],
        )
        .await?;

        let subject = interop::Subject::from(db_subject);

        Ok(subject)
    }

    pub async fn edit_subject(
        db_pool: &Pool,
        subject: &interop::Subject,
        subject_id: Key,
        user_id: Key,
    ) -> Result<interop::Subject> {
        let db_subject = pg::one_non_transactional::<Subject>(
            db_pool,
            include_str!("sql/subjects_edit.sql"),
            &[&subject_id, &user_id, &subject.name],
        )
        .await?;

        let subject = interop::Subject::from(db_subject);

        Ok(subject)
    }

    pub async fn delete_subject(db_pool: &Pool, subject_id: Key, user_id: Key) -> Result<()> {
        let mut client: Client = db_pool.get().await.map_err(|err| Error::DeadPool(err))?;
        let tx = client.transaction().await?;

        // deleting notes require valid edge information, so delete notes before edges
        //
        handle_notes::db::delete_all_notes_for(&tx, Model::Subject, subject_id).await?;
        handle_edges::db::delete_all_edges_for(&tx, Model::Subject, subject_id).await?;
        pg::delete_owned_by_user::<Subject>(&tx, subject_id, user_id, Model::Subject).await?;

        tx.commit().await?;

        Ok(())
    }

    // --------------------------------------------------------------------------------

    pub async fn get_subjects_referenced(
        db_pool: &Pool,
        model: Model,
        id: Key,
    ) -> Result<Vec<interop::SubjectReference>> {
        let e1 = edge_type::model_to_note(model)?;
        let foreign_key = model_to_foreign_key(model);

        let stmt = include_str!("sql/subjects_referenced.sql");
        let stmt = stmt.replace("$foreign_key", foreign_key);

        let db_subjects_referenced = pg::many_non_transactional::<SubjectReference>(
            db_pool,
            &stmt,
            &[&id, &e1, &EdgeType::NoteToSubject],
        )
        .await?;

        let subjects_referenced = db_subjects_referenced
            .iter()
            .map(|p| interop::SubjectReference::from(p))
            .collect();

        Ok(subjects_referenced)
    }

    pub async fn subjects_that_mention(
        db_pool: &Pool,
        model: Model,
        id: Key,
    ) -> Result<Vec<interop::SubjectMention>> {
        let e1 = edge_type::note_to_model(model)?;
        let foreign_key = model_to_foreign_key(model);

        let stmt = include_str!("sql/subjects_that_mention.sql");
        let stmt = stmt.replace("$foreign_key", foreign_key);

        let db_mentioned_in_subjects = pg::many_non_transactional::<SubjectMention>(
            db_pool,
            &stmt,
            &[&id, &e1, &EdgeType::SubjectToNote],
        )
        .await?;

        let mentioned_in_subjects = db_mentioned_in_subjects
            .iter()
            .map(|s| interop::SubjectMention::from(s))
            .collect();

        Ok(mentioned_in_subjects)
    }
}
