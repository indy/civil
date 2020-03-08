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
    pub struct ArticleMention {
        pub article_id: Key,
        pub article_title: String,
    }

    impl From<&super::db::ArticleMention> for ArticleMention {
        fn from(sm: &super::db::ArticleMention) -> ArticleMention {
            ArticleMention {
                article_id: sm.article_id,
                article_title: sm.article_title.to_string(),
            }
        }
    }
}

pub mod db {
    use crate::types::Key;
    use crate::edge_type::{self, EdgeType};
    use crate::model::{Model, model_to_foreign_key};
    use crate::error::Result;
    use crate::pg;
    use deadpool_postgres::Pool;
    use serde::{Deserialize, Serialize};
    use tokio_pg_mapper_derive::PostgresMapper;
    #[allow(unused_imports)]
    use tracing::info;

    #[derive(Debug, Clone, Serialize, Deserialize, PostgresMapper)]
    #[pg_mapper(table = "articles")]
    pub struct ArticleMention {
        pub article_id: Key,
        pub article_title: String,
    }

    pub async fn articles_that_mention(
        db_pool: &Pool,
        model: Model,
        id: Key,
    ) -> Result<Vec<ArticleMention>> {
        let e1 = edge_type::note_to_model(model)?;
        let foreign_key = model_to_foreign_key(model);

        let stmt = include_str!("sql/articles_that_mention.sql");
        let stmt = stmt.replace("$foreign_key", foreign_key);

        let res = pg::many::<ArticleMention>(
            db_pool,
            &stmt,
            &[&id, &e1, &EdgeType::ArticleToNote],
        ).await?;

        Ok(res)
    }
}
