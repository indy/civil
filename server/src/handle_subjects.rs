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
use crate::handle_articles;
use crate::handle_historic_people;
use crate::handle_notes;
use crate::model::Model;
use crate::note_type::NoteType;
use crate::session;
use crate::types::Key;
use crate::web_common;
use actix_web::web::{Data, /*Json, */ Path};
use actix_web::HttpResponse;
use deadpool_postgres::Pool;
use tracing::info;

pub mod web {
    use crate::handle_articles::web::ArticleMention;
    use crate::handle_historic_people::web::{PersonMention, PersonReference};
    use crate::handle_notes::web::Note;
    use crate::types::Key;

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
    pub struct SubjectReference {
        pub note_id: Key,
        pub subject_id: Key,
        pub subject_name: String,
    }

    impl From<&super::db::SubjectReference> for SubjectReference {
        fn from(s: &super::db::SubjectReference) -> SubjectReference {
            SubjectReference {
                note_id: s.note_id,
                subject_id: s.subject_id,
                subject_name: s.subject_name.to_string(),
            }
        }
    }

    #[derive(Debug, serde::Deserialize, serde::Serialize)]
    pub struct SubjectMention {
        pub subject_id: Key,
        pub subject_name: String,
    }

    impl From<&super::db::SubjectMention> for SubjectMention {
        fn from(sm: &super::db::SubjectMention) -> SubjectMention {
            SubjectMention {
                subject_id: sm.subject_id,
                subject_name: sm.subject_name.to_string(),
            }
        }
    }
}

pub async fn create_subject(
    _db_pool: Data<Pool>,
    _params: Path<web_common::IdParam>,
    _session: actix_session::Session,
) -> Result<HttpResponse> {
    unimplemented!();
}

pub async fn get_subjects(
    db_pool: Data<Pool>,
    _session: actix_session::Session,
) -> Result<HttpResponse> {
    info!("get_subjects");
    // let user_id = session::user_id(&session)?;
    let user_id: Key = 1;
    // db statement
    let db_subjects: Vec<db::Subject> = db::get_subjects(&db_pool, user_id).await?;

    let subjects: Vec<web::Subject> = db_subjects
        .into_iter()
        .map(|db_subject| web::Subject::from(db_subject))
        .collect();

    Ok(HttpResponse::Ok().json(subjects))
}

pub async fn get_subject(
    db_pool: Data<Pool>,
    params: Path<web_common::IdParam>,
    _session: actix_session::Session,
) -> Result<HttpResponse> {
    info!("get_subject {:?}", params.id);
    // let user_id = session::user_id(&session)?;
    let user_id: Key = 1;

    // db statements
    let subject_id = params.id;
    let db_subject: db::Subject = db::get_subject(&db_pool, subject_id, user_id).await?;
    let mut subject = web::Subject::from(db_subject);

    let db_notes =
        handle_notes::db::all_notes_for(&db_pool, Model::Subject, subject_id, NoteType::Note)
            .await?;
    let notes = db_notes
        .iter()
        .map(|n| handle_notes::web::Note::from(n))
        .collect();
    subject.notes = Some(notes);

    let db_quotes =
        handle_notes::db::all_notes_for(&db_pool, Model::Subject, subject_id, NoteType::Quote)
            .await?;
    let quotes = db_quotes
        .iter()
        .map(|n| handle_notes::web::Note::from(n))
        .collect();
    subject.quotes = Some(quotes);

    let db_people_referenced =
        handle_historic_people::db::get_people_referenced(&db_pool, Model::Subject, subject_id)
            .await?;
    let people_referenced = db_people_referenced
        .iter()
        .map(|p| handle_historic_people::web::PersonReference::from(p))
        .collect();
    subject.people_referenced = Some(people_referenced);

    let db_subjects_referenced =
        db::get_subjects_referenced(&db_pool, Model::Subject, subject_id).await?;
    let subjects_referenced = db_subjects_referenced
        .iter()
        .map(|p| web::SubjectReference::from(p))
        .collect();
    subject.subjects_referenced = Some(subjects_referenced);

    let db_mentioned_by_people =
        handle_historic_people::db::people_that_mention(&db_pool, Model::Subject, subject_id)
            .await?;
    let mentioned_by_people = db_mentioned_by_people
        .iter()
        .map(|m| handle_historic_people::web::PersonMention::from(m))
        .collect();
    subject.mentioned_by_people = Some(mentioned_by_people);

    let db_mentioned_in_subjects =
        db::subjects_that_mention(&db_pool, Model::Subject, subject_id).await?;
    let mentioned_in_subjects = db_mentioned_in_subjects
        .iter()
        .map(|s| web::SubjectMention::from(s))
        .collect();
    subject.mentioned_in_subjects = Some(mentioned_in_subjects);

    let db_mentioned_in_articles =
        handle_articles::db::articles_that_mention(&db_pool, Model::Subject, subject_id).await?;
    let mentioned_in_articles = db_mentioned_in_articles
        .iter()
        .map(|a| handle_articles::web::ArticleMention::from(a))
        .collect();
    subject.mentioned_in_articles = Some(mentioned_in_articles);

    Ok(HttpResponse::Ok().json(subject))
}

pub async fn edit_subject(
    _db_pool: Data<Pool>,
    _params: Path<web_common::IdParam>,
    _session: actix_session::Session,
) -> Result<HttpResponse> {
    unimplemented!();
}

pub async fn delete_subject(
    db_pool: Data<Pool>,
    params: Path<web_common::IdParam>,
    session: actix_session::Session,
) -> Result<HttpResponse> {
    let user_id = session::user_id(&session)?;

    db::delete_subject(&db_pool, params.id, user_id).await?;

    Ok(HttpResponse::Ok().json(true))
}

pub mod db {
    use super::web;
    use crate::edge_type::{self, EdgeType};
    use crate::error::Result;
    use crate::handle_edges;
    use crate::handle_notes;
    use crate::model::{model_to_foreign_key, Model};
    use crate::pg;
    use crate::types::Key;
    use deadpool_postgres::Pool;
    use serde::{Deserialize, Serialize};
    use tokio_pg_mapper_derive::PostgresMapper;
    #[allow(unused_imports)]
    use tracing::info;

    #[derive(Debug, Clone, Serialize, Deserialize, PostgresMapper)]
    #[pg_mapper(table = "subjects")]
    pub struct Subject {
        pub id: Key,
        pub name: String,
    }

    #[derive(Debug, Clone, Serialize, Deserialize, PostgresMapper)]
    #[pg_mapper(table = "subjects")]
    pub struct SubjectReference {
        pub note_id: Key,
        pub subject_id: Key,
        pub subject_name: String,
    }

    #[derive(Debug, Clone, Serialize, Deserialize, PostgresMapper)]
    #[pg_mapper(table = "subjects")]
    pub struct SubjectMention {
        pub subject_id: Key,
        pub subject_name: String,
    }

    // todo: should this from impl be in web???
    impl From<Subject> for web::Subject {
        fn from(s: Subject) -> web::Subject {
            web::Subject {
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

    pub async fn get_subjects(db_pool: &Pool, user_id: Key) -> Result<Vec<Subject>> {
        let res =
            pg::many::<Subject>(db_pool, include_str!("sql/subjects_all.sql"), &[&user_id]).await?;

        Ok(res)
    }

    pub async fn get_subject(db_pool: &Pool, subject_id: Key, user_id: Key) -> Result<Subject> {
        let subject = pg::one::<Subject>(
            db_pool,
            include_str!("sql/subjects_get.sql"),
            &[&subject_id, &user_id],
        )
        .await?;

        Ok(subject)
    }

    pub async fn delete_subject(db_pool: &Pool, subject_id: Key, user_id: Key) -> Result<()> {
        // deleting notes require valid edge information, so delete notes before edges
        //
        handle_notes::db::delete_all_notes_for(&db_pool, Model::Subject, subject_id).await?;
        handle_edges::db::delete_all_edges_for(&db_pool, Model::Subject, subject_id).await?;

        pg::delete_owned::<Subject>(db_pool, subject_id, user_id, Model::Subject).await?;

        Ok(())
    }

    // --------------------------------------------------------------------------------

    pub async fn get_subjects_referenced(
        db_pool: &Pool,
        model: Model,
        id: Key,
    ) -> Result<Vec<SubjectReference>> {
        let e1 = edge_type::model_to_note(model)?;
        let foreign_key = model_to_foreign_key(model);

        let stmt = include_str!("sql/subjects_referenced.sql");
        let stmt = stmt.replace("$foreign_key", foreign_key);

        let res =
            pg::many::<SubjectReference>(db_pool, &stmt, &[&id, &e1, &EdgeType::NoteToSubject])
                .await?;
        Ok(res)
    }

    pub async fn subjects_that_mention(
        db_pool: &Pool,
        model: Model,
        id: Key,
    ) -> Result<Vec<SubjectMention>> {
        let e1 = edge_type::note_to_model(model)?;
        let foreign_key = model_to_foreign_key(model);

        let stmt = include_str!("sql/subjects_that_mention.sql");
        let stmt = stmt.replace("$foreign_key", foreign_key);

        let res = pg::many::<SubjectMention>(db_pool, &stmt, &[&id, &e1, &EdgeType::SubjectToNote])
            .await?;

        Ok(res)
    }
}
