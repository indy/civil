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
    use crate::types::Key;

    #[derive(Debug, serde::Deserialize, serde::Serialize)]
    pub struct Note {
        pub id: Key,
        pub content: String,
    }

    impl From<&super::db::Note> for Note {
        fn from(dbn: &super::db::Note) -> Note {
            Note {
                id: dbn.id,
                content: dbn.content.to_string(),
            }
        }
    }
}

pub mod db {
    use crate::types::Key;
    use crate::edge_type;
    use crate::model::{Model, model_to_foreign_key};
    use crate::note_type::NoteType;
    use crate::error::Result;
    use crate::pg;
    use deadpool_postgres::Pool;
    use serde::{Deserialize, Serialize};
    use tokio_pg_mapper_derive::PostgresMapper;
    #[allow(unused_imports)]
    use tracing::info;

    #[derive(Debug, Deserialize, PostgresMapper, Serialize)]
    #[pg_mapper(table = "notes")]
    pub struct Note {
        pub id: Key,
        pub content: String,
    }

    pub async fn all_notes_for(
        db_pool: &Pool,
        model: Model,
        id: Key,
        note_type: NoteType,
    ) -> Result<Vec<Note>> {
        let e1 = edge_type::model_to_note(model)?;
        let foreign_key = model_to_foreign_key(model);

        let stmt = include_str!("sql/notes_all_for.sql");
        let stmt = stmt.replace("$foreign_key", foreign_key);

        let res = pg::many::<Note>(db_pool, &stmt, &[&id, &e1, &note_type]).await?;
        Ok(res)
    }
}
