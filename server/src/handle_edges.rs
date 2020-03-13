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

pub mod db {
    use crate::error::Result;
    use crate::interop::Key;
    use crate::model::{model_to_foreign_key, Model};
    use crate::pg;
    use deadpool_postgres::Pool;
    use serde::{Deserialize, Serialize};
    use tokio_pg_mapper_derive::PostgresMapper;
    #[allow(unused_imports)]
    use tracing::info;

    #[derive(Debug, Deserialize, PostgresMapper, Serialize)]
    #[pg_mapper(table = "edges")]
    struct Edge {
        id: Key,
        annotation: String,
    }

    pub async fn delete_all_edges_for(db_pool: &Pool, model: Model, id: Key) -> Result<()> {
        let foreign_key = model_to_foreign_key(model);

        let stmt = include_str!("sql/edges_delete.sql");
        let stmt = stmt.replace("$foreign_key", foreign_key);

        pg::zero::<Edge>(db_pool, &stmt, &[&id]).await?;
        Ok(())
    }
}
