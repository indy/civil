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


pub mod web {
    // #[derive(Debug, serde::Deserialize, serde::Serialize)]
    // pub struct Subject {
    //     pub id: i64,
    //     pub name: String,
    // }

    // impl From<&super::db::Subject> for Subject {
    //     fn from(db_subject: &super::db::Subject) -> Subject {
    //         Subject {
    //             id: db_subject.id,
    //             name: db_subject.name.to_string(),
    //         }
    //     }
    // }

    #[derive(Debug, serde::Deserialize, serde::Serialize)]
    pub struct SubjectReference {
        pub note_id: i64,
        pub subject_id: i64,
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
}

pub mod db {
    use crate::error::Result;
    use crate::pg;
    use deadpool_postgres::Pool;
    use serde::{Deserialize, Serialize};
    use tokio_pg_mapper_derive::PostgresMapper;
    #[allow(unused_imports)]
    use tracing::info;
    use crate::crap_models::{self, Model, EdgeType};



    #[derive(Debug, Clone, Serialize, Deserialize, PostgresMapper)]
    #[pg_mapper(table = "subjects")]
    pub struct SubjectReference {
        pub note_id: i64,
        pub subject_id: i64,
        pub subject_name: String,
    }


    // --------------------------------------------------------------------------------

    pub async fn get_subjects_referenced(db_pool: &Pool, model: Model, id: i64) -> Result<Vec<SubjectReference>> {
        let e1 = crap_models::edgetype_for_model_to_note(model)?;
        let foreign_key = crap_models::model_to_foreign_key(model);

        let stmt = include_str!("sql/subjects_referenced.sql");
        let stmt = stmt.replace("$foreign_key", foreign_key);

        let res = pg::many::<SubjectReference>(db_pool, &stmt, &[&id, &e1, &EdgeType::NoteToSubject]).await?;
        Ok(res)
    }
}
