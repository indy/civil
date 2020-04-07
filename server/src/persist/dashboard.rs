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
use crate::interop::dashboard as interop;
use crate::interop::Key;
use deadpool_postgres::Pool;

use crate::interop::edges as edges_interop;
use crate::persist::edges as edges_persist;

#[allow(unused_imports)]
use tracing::info;

enum DeckKind {
    Article,
    Book,
    Person,
    Point,
    Idea,
}

impl DeckKind {
    fn to_string(&self) -> &'static str {
        match *self {
            DeckKind::Article => "article",
            DeckKind::Book => "book",
            DeckKind::Person => "person",
            DeckKind::Point => "point",
            DeckKind::Idea => "idea",
        }
    }
}

pub(crate) async fn get(db_pool: &Pool, user_id: Key) -> Result<interop::Dashboard> {
    let tags = get_tags(db_pool, user_id, 10).await?;
    let articles = get_decks(db_pool, user_id, DeckKind::Article, 10).await?;
    let books = get_decks(db_pool, user_id, DeckKind::Book, 10).await?;
    let people = get_decks(db_pool, user_id, DeckKind::Person, 10).await?;
    let points = get_decks(db_pool, user_id, DeckKind::Point, 10).await?;
    let ideas = get_decks(db_pool, user_id, DeckKind::Idea, 10).await?;

    Ok(interop::Dashboard {
        tags,
        articles,
        books,
        people,
        points,
        ideas,
    })
}

async fn get_tags(
    db_pool: &Pool,
    user_id: Key,
    limit: usize,
) -> Result<Vec<edges_interop::LinkBack>> {
    let stmt = include_str!("sql/dashboard_tags.sql");
    let stmt = stmt.replace("$limit", &limit.to_string());

    pg::many_from::<edges_persist::LinkBackToTag, edges_interop::LinkBack>(
        db_pool,
        &stmt,
        &[&user_id],
    )
    .await
}

async fn get_decks(
    db_pool: &Pool,
    user_id: Key,
    deck_kind: DeckKind,
    limit: usize,
) -> Result<Vec<edges_interop::LinkBack>> {
    let stmt = include_str!("sql/dashboard_decks.sql");
    let stmt = stmt.replace("$deck_kind", deck_kind.to_string());
    let stmt = stmt.replace("$limit", &limit.to_string());

    pg::many_from::<edges_persist::LinkBackToDeck, edges_interop::LinkBack>(
        db_pool,
        &stmt,
        &[&user_id],
    )
    .await
}
