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
use crate::error::Result;
use crate::interop::{Key, Model};
use crate::persist::dates;
use deadpool_postgres::Transaction;
use serde::{Deserialize, Serialize};
use tokio_pg_mapper_derive::PostgresMapper;

#[allow(unused_imports)]
use tracing::info;

#[derive(Debug, Clone, Serialize, Deserialize, PostgresMapper)]
#[pg_mapper(table = "timespans")]
struct Timespan {
    id: Key,
    textual: Option<String>,
    date_start_id: Option<Key>,
    date_end_id: Option<Key>,
}

pub(crate) async fn create(
    tx: &Transaction<'_>,
    start_id: Option<Key>,
    end_id: Option<Key>,
    textual: Option<String>,
) -> Result<Key> {
    info!(
        "create_timespan {:?} {:?} {:?}",
        &start_id, &end_id, &textual
    );

    let res = pg::one::<Timespan>(
        tx,
        include_str!("sql/timespans_create.sql"),
        &[&textual, &start_id, &end_id],
    )
    .await;

    match res {
        Ok(timespan) => {
            info!("ok result");
            Ok(timespan.id)
        }
        Err(e) => {
            info!("error!!! {:?}", e);
            Err(e)
        }
    }
}

pub(crate) async fn delete(tx: &Transaction<'_>, timespan_id: Key) -> Result<()> {
    let timespan =
        pg::one::<Timespan>(tx, include_str!("sql/timespans_get.sql"), &[&timespan_id]).await?;

    let stmt = pg::delete_statement(Model::Timespan)?;

    pg::zero::<Timespan>(tx, &stmt, &[&timespan_id]).await?;

    if let Some(id) = timespan.date_start_id {
        dates::delete(&tx, id).await?;
    }
    if let Some(id) = timespan.date_end_id {
        dates::delete(&tx, id).await?;
    }

    Ok(())
}
