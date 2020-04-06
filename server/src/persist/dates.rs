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
use crate::interop::dates as interop;
use crate::interop::{Key, Model};
use deadpool_postgres::Transaction;
use serde::{Deserialize, Serialize};
use tokio_pg_mapper_derive::PostgresMapper;

#[allow(unused_imports)]
use tracing::info;

#[derive(Debug, Deserialize, PostgresMapper, Serialize)]
#[pg_mapper(table = "dates")]
struct Date {
    id: Key,

    // this doens't work - timezone conversion issue???
    // created_at: chrono::NaiveDateTime,
    textual: Option<String>,
    exact_date: Option<chrono::NaiveDate>,
    lower_date: Option<chrono::NaiveDate>,
    upper_date: Option<chrono::NaiveDate>,
    fuzz: f32,
}

impl From<Date> for interop::Date {
    fn from(e: Date) -> interop::Date {
        interop::Date {
            id: e.id,
            textual: e.textual,
            exact_date: e.exact_date,
            lower_date: e.lower_date,
            upper_date: e.upper_date,
            fuzz: e.fuzz,
        }
    }
}

pub(crate) async fn create(
    tx: &Transaction<'_>,
    date: &interop::ProtoDate,
) -> Result<interop::Date> {
    let db_date = pg::one::<Date>(
        tx,
        include_str!("sql/dates_create.sql"),
        &[
            &date.textual,
            &date.exact_date,
            &date.lower_date,
            &date.upper_date,
            &date.fuzz,
        ],
    )
    .await?;

    let date = interop::Date::from(db_date);

    Ok(date)
}

pub(crate) async fn edit(
    tx: &Transaction<'_>,
    date: &interop::ProtoDate,
    date_id: Key,
) -> Result<interop::Date> {
    let db_date = pg::one::<Date>(
        tx,
        include_str!("sql/dates_edit.sql"),
        &[
            &date_id,
            &date.textual,
            &date.exact_date,
            &date.lower_date,
            &date.upper_date,
            &date.fuzz,
        ],
    )
    .await?;

    let date = interop::Date::from(db_date);

    Ok(date)
}

pub(crate) async fn delete(tx: &Transaction<'_>, date_id: Key) -> Result<()> {
    let stmt = pg::delete_statement(Model::Date)?;

    pg::zero(tx, &stmt, &[&date_id]).await?;
    Ok(())
}
