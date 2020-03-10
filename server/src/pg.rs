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

use crate::error::{Error, Result};
use crate::model::{model_to_table_name, Model};
use crate::types::Key;
use deadpool_postgres::{Client, Pool};
use tokio_pg_mapper::FromTokioPostgresRow;

pub async fn zero<T>(
    db_pool: &Pool,
    sql_query: &str,
    sql_params: &[&(dyn tokio_postgres::types::ToSql + std::marker::Sync)],
) -> Result<()>
where
    T: FromTokioPostgresRow,
{
    let client: Client = db_pool.get().await.map_err(|err| Error::DeadPool(err))?;

    let _stmt = sql_query;
    let _stmt = _stmt.replace("$table_fields", &T::sql_table_fields());
    let stmt = client.prepare(&_stmt).await?;

    client.query(&stmt, sql_params).await?;

    Ok(())
}

pub async fn one<T>(
    db_pool: &Pool,
    sql_query: &str,
    sql_params: &[&(dyn tokio_postgres::types::ToSql + std::marker::Sync)],
) -> Result<T>
where
    T: FromTokioPostgresRow,
{
    let client: Client = db_pool.get().await.map_err(|err| Error::DeadPool(err))?;

    let _stmt = sql_query;
    let _stmt = _stmt.replace("$table_fields", &T::sql_table_fields());
    let stmt = client.prepare(&_stmt).await?;

    let res = client
        .query(&stmt, sql_params)
        .await?
        .iter()
        .map(|row| T::from_row_ref(row).unwrap())
        .collect::<Vec<T>>()
        .pop()
        .ok_or(Error::NotFound); // more applicable for SELECTs

    res
}

pub async fn many<T>(
    db_pool: &Pool,
    sql_query: &str,
    sql_params: &[&(dyn tokio_postgres::types::ToSql + std::marker::Sync)],
) -> Result<Vec<T>>
where
    T: FromTokioPostgresRow,
{
    let client: Client = db_pool.get().await.map_err(|err| Error::DeadPool(err))?;

    let _stmt = sql_query;
    let _stmt = _stmt.replace("$table_fields", &T::sql_table_fields());
    let stmt = client.prepare(&_stmt).await?;

    let vec = client
        .query(&stmt, sql_params)
        .await?
        .iter()
        .map(|row| T::from_row_ref(row).unwrap())
        .collect::<Vec<T>>();

    Ok(vec)
}

pub async fn delete<T>(db_pool: &Pool, id: Key, model: Model) -> Result<()>
where
    T: FromTokioPostgresRow,
{
    let stmt = include_str!("sql/delete.sql");
    let stmt = stmt.replace("$table_name", model_to_table_name(model));

    zero::<T>(db_pool, &stmt, &[&id]).await?;
    Ok(())
}

pub async fn delete_owned<T>(db_pool: &Pool, id: Key, user_id: Key, model: Model) -> Result<()>
where
    T: FromTokioPostgresRow,
{
    let stmt = include_str!("sql/delete_owned.sql");
    let stmt = stmt.replace("$table_name", model_to_table_name(model));

    zero::<T>(db_pool, &stmt, &[&id, &user_id]).await?;
    Ok(())
}
