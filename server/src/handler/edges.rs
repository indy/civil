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
use crate::interop::IdParam;
use crate::session;
use actix_web::web::{Data, Json, Path};
use actix_web::HttpResponse;
use deadpool_postgres::Pool;
#[allow(unused_imports)]
use tracing::info;

mod interop {
    use crate::interop::Key;

    #[derive(Debug, serde::Deserialize, serde::Serialize)]
    pub struct Edge {
        pub id: Key,

        pub from_deck_id: Option<Key>,
        pub to_deck_id: Option<Key>,
        pub from_note_id: Option<Key>,
        pub to_note_id: Option<Key>,
    }

    // currently these are all from Note to a Deck based model
    //
    #[derive(Debug, serde::Deserialize, serde::Serialize)]
    pub struct CreateEdge {
        pub note_id: Option<Key>,
        pub person_id: Option<Key>,
        pub subject_id: Option<Key>,
    }
}

pub async fn create_edge(
    edge: Json<interop::CreateEdge>,
    db_pool: Data<Pool>,
    session: actix_session::Session,
) -> Result<HttpResponse> {
    info!("create_edge");
    let edge = edge.into_inner();
    let user_id = session::user_id(&session)?;

    // db statement
    let edge = db::create(&db_pool, &edge, user_id).await?;

    Ok(HttpResponse::Ok().json(edge))
}

pub async fn delete_edge(
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
    use crate::error::{Error, Result};
    use crate::interop::{model_to_node_kind, Key, Model};
    use crate::pg;
    use deadpool_postgres::{Client, Pool, Transaction};
    use serde::{Deserialize, Serialize};
    use tokio_pg_mapper_derive::PostgresMapper;
    #[allow(unused_imports)]
    use tracing::info;

    #[derive(Debug, Deserialize, PostgresMapper, Serialize)]
    #[pg_mapper(table = "edges2")]
    struct Edge {
        id: Key,
        annotation: Option<String>,
    }

    impl From<Edge> for interop::Edge {
        fn from(e: Edge) -> interop::Edge {
            interop::Edge {
                id: e.id,
                from_deck_id: None,
                to_deck_id: None,
                from_note_id: None,
                to_note_id: None,
            }
        }
    }

    // currently this function only creates edges 'from' a note 'to' a deck derived struct
    pub async fn create(
        db_pool: &Pool,
        edge: &interop::CreateEdge,
        _user_id: Key,
    ) -> Result<interop::Edge> {
        let node_kind;
        let to_id: Key;

        // todo: make this code good
        if let Some(id) = edge.person_id {
            node_kind = model_to_node_kind(Model::HistoricPerson)?;
            to_id = id;
        } else if let Some(id) = edge.subject_id {
            node_kind = model_to_node_kind(Model::Subject)?;
            to_id = id;
        } else {
            return Err(Error::ModelConversion);
        };

        let note_id;
        if let Some(id) = edge.note_id {
            note_id = id;
        } else {
            return Err(Error::MissingField);
        }

        let stmt = include_str!("../sql/edges_create_from_note.sql");
        let stmt = stmt.replace("$to_kind", node_kind);

        pg::one_from::<Edge, interop::Edge>(db_pool, &stmt, &[&note_id, &to_id]).await
    }

    pub async fn delete(db_pool: &Pool, edge_id: Key, _user_id: Key) -> Result<()> {
        let mut client: Client = db_pool.get().await.map_err(Error::DeadPool)?;
        let tx = client.transaction().await?;

        let stmt = pg::delete_statement(Model::Edge)?;

        pg::zero::<Edge>(&tx, &stmt, &[&edge_id]).await?;

        tx.commit().await?;

        Ok(())
    }

    pub async fn create_edge_to_note(
        tx: &Transaction<'_>,
        from_model: Model,
        from_key: Key,
        note_key: Key,
    ) -> Result<Key> {
        let from_kind = model_to_node_kind(from_model)?;

        let stmt = include_str!("../sql/edges_create_to_note.sql");
        let stmt = stmt.replace("$from_kind", from_kind);

        let edge = pg::one::<Edge>(tx, &stmt, &[&from_key, &note_key]).await?;

        Ok(edge.id)
    }

    pub async fn delete_all_edges_connected_with_deck(
        tx: &Transaction<'_>,
        deck_id: Key,
    ) -> Result<()> {
        let stmt = include_str!("../sql/edges_delete_deck.sql");

        pg::zero::<Edge>(tx, &stmt, &[&deck_id]).await?;
        Ok(())
    }

    pub async fn delete_all_edges_connected_with_note(tx: &Transaction<'_>, id: Key) -> Result<()> {
        let stmt = include_str!("../sql/edges_delete_note.sql");

        pg::zero::<Edge>(tx, &stmt, &[&id]).await?;
        Ok(())
    }
}
