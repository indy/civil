// Copyright (C) 2021 Inderjit Gill <email@indy.io>

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

use crate::error::{Error, Result};
use crate::interop::stats as interop;
use crate::interop::Key;
use deadpool_postgres::{Client, Pool, Transaction};
use serde::{Deserialize, Serialize};
use tokio_pg_mapper_derive::PostgresMapper;

#[allow(unused_imports)]
use tracing::info;

#[derive(Debug, Deserialize, PostgresMapper, Serialize)]
#[pg_mapper(table = "stats")]
struct Stats {
    id: Key,
    created_at: chrono::DateTime<chrono::Utc>,

    user_id: Key,

    num_ideas: i32,
    num_publications: i32,
    num_people: i32,
    num_timelines: i32,

    num_refs: i32,
    num_cards: i32,
    num_card_ratings: i32,
    num_images: i32,

    num_notes_in_ideas: i32,
    num_notes_in_publications: i32,
    num_notes_in_people: i32,
    num_notes_in_timelines: i32,

    num_points_in_people: i32,
    num_points_in_timelines: i32,

    num_refs_ideas_to_ideas: i32,
    num_refs_ideas_to_publications: i32,
    num_refs_ideas_to_people: i32,
    num_refs_ideas_to_timelines: i32,

    num_refs_publications_to_ideas: i32,
    num_refs_publications_to_publications: i32,
    num_refs_publications_to_people: i32,
    num_refs_publications_to_timelines: i32,

    num_refs_people_to_ideas: i32,
    num_refs_people_to_publications: i32,
    num_refs_people_to_people: i32,
    num_refs_people_to_timelines: i32,

    num_refs_timelines_to_ideas: i32,
    num_refs_timelines_to_publications: i32,
    num_refs_timelines_to_people: i32,
    num_refs_timelines_to_timelines: i32,
}

impl From<Stats> for interop::Stats {
    fn from(s: Stats) -> interop::Stats {
        interop::Stats {
            num_ideas: s.num_ideas,
            num_publications: s.num_publications,
            num_people: s.num_people,
            num_timelines: s.num_timelines,

            num_refs: s.num_refs,
            num_cards: s.num_cards,
            num_card_ratings: s.num_card_ratings,
            num_images: s.num_images,

            num_notes_in_ideas: s.num_notes_in_ideas,
            num_notes_in_publications: s.num_notes_in_publications,
            num_notes_in_people: s.num_notes_in_people,
            num_notes_in_timelines: s.num_notes_in_timelines,

            num_points_in_people: s.num_points_in_people,
            num_points_in_timelines: s.num_points_in_timelines,

            num_refs_ideas_to_ideas: s.num_refs_ideas_to_ideas,
            num_refs_ideas_to_publications: s.num_refs_ideas_to_publications,
            num_refs_ideas_to_people: s.num_refs_ideas_to_people,
            num_refs_ideas_to_timelines: s.num_refs_ideas_to_timelines,

            num_refs_publications_to_ideas: s.num_refs_publications_to_ideas,
            num_refs_publications_to_publications: s.num_refs_publications_to_publications,
            num_refs_publications_to_people: s.num_refs_publications_to_people,
            num_refs_publications_to_timelines: s.num_refs_publications_to_timelines,

            num_refs_people_to_ideas: s.num_refs_people_to_ideas,
            num_refs_people_to_publications: s.num_refs_people_to_publications,
            num_refs_people_to_people: s.num_refs_people_to_people,
            num_refs_people_to_timelines: s.num_refs_people_to_timelines,

            num_refs_timelines_to_ideas: s.num_refs_timelines_to_ideas,
            num_refs_timelines_to_publications: s.num_refs_timelines_to_publications,
            num_refs_timelines_to_people: s.num_refs_timelines_to_people,
            num_refs_timelines_to_timelines: s.num_refs_timelines_to_timelines,
        }
    }
}


#[derive(Debug, Clone, Serialize, Deserialize, PostgresMapper)]
#[pg_mapper(table = "decks")]
pub struct Count {
    pub count: i64, // note with postgres' Int8 the '8' refers to bytes not bits
}

// counts are 8 bytes (i64) but the columns in the stats table are INTEGER or 4 bytes (i32)
impl From<Count> for i32 {
    fn from(c: Count) -> i32 {
        c.count as i32
    }
}

pub(crate) async fn create_stats(db_pool: &Pool, user_id: Key, stats: &interop::Stats) -> Result<()> {
    info!("create_stats");

    let mut client: Client = db_pool.get().await.map_err(Error::DeadPool)?;
    let tx = client.transaction().await?;

    pg::zero(
        &tx,
        "INSERT INTO stats(user_id,
                           num_ideas,
                           num_publications,
                           num_people,
                           num_timelines,
                           num_refs,
                           num_cards,
                           num_card_ratings,
                           num_images,
                           num_notes_in_ideas,
                           num_notes_in_publications,
                           num_notes_in_people,
                           num_notes_in_timelines,
                           num_points_in_people,
                           num_points_in_timelines,
                           num_refs_ideas_to_ideas,
                           num_refs_ideas_to_publications,
                           num_refs_ideas_to_people,
                           num_refs_ideas_to_timelines,
                           num_refs_publications_to_ideas,
                           num_refs_publications_to_publications,
                           num_refs_publications_to_people,
                           num_refs_publications_to_timelines,
                           num_refs_people_to_ideas,
                           num_refs_people_to_publications,
                           num_refs_people_to_people,
                           num_refs_people_to_timelines,
                           num_refs_timelines_to_ideas,
                           num_refs_timelines_to_publications,
                           num_refs_timelines_to_people,
                           num_refs_timelines_to_timelines)
         VALUES (      $1,  $2,  $3,  $4,  $5,  $6,  $7,  $8,  $9,
                 $10, $11, $12, $13, $14, $15, $16, $17, $18, $19,
                 $20, $21, $22, $23, $24, $25, $26, $27, $28, $29,
                 $30, $31)",
        &[&user_id,
          &stats.num_ideas,
          &stats.num_publications,
          &stats.num_people,
          &stats.num_timelines,
          &stats.num_refs,
          &stats.num_cards,
          &stats.num_card_ratings,
          &stats.num_images,
          &stats.num_notes_in_ideas,
          &stats.num_notes_in_publications,
          &stats.num_notes_in_people,
          &stats.num_notes_in_timelines,
          &stats.num_points_in_people,
          &stats.num_points_in_timelines,
          &stats.num_refs_ideas_to_ideas,
          &stats.num_refs_ideas_to_publications,
          &stats.num_refs_ideas_to_people,
          &stats.num_refs_ideas_to_timelines,
          &stats.num_refs_publications_to_ideas,
          &stats.num_refs_publications_to_publications,
          &stats.num_refs_publications_to_people,
          &stats.num_refs_publications_to_timelines,
          &stats.num_refs_people_to_ideas,
          &stats.num_refs_people_to_publications,
          &stats.num_refs_people_to_people,
          &stats.num_refs_people_to_timelines,
          &stats.num_refs_timelines_to_ideas,
          &stats.num_refs_timelines_to_publications,
          &stats.num_refs_timelines_to_people,
          &stats.num_refs_timelines_to_timelines],
    )
        .await?;

    tx.commit().await?;

    Ok(())
}

pub(crate) async fn get_last_saved_stats(db_pool: &Pool, user_id: Key) -> Result<interop::Stats> {
    let db_stats = pg::one_non_transactional::<Stats>(
        db_pool,
        "select s.id,
                s.created_at,
                s.user_id,
                s.num_ideas,
                s.num_publications,
                s.num_people,
                s.num_timelines,
                s.num_refs,
                s.num_cards,
                s.num_card_ratings,
                s.num_images,
                s.num_notes_in_ideas,
                s.num_notes_in_publications,
                s.num_notes_in_people,
                s.num_notes_in_timelines,
                s.num_points_in_people,
                s.num_points_in_timelines,
                s.num_refs_ideas_to_ideas,
                s.num_refs_ideas_to_publications,
                s.num_refs_ideas_to_people,
                s.num_refs_ideas_to_timelines,
                s.num_refs_publications_to_ideas,
                s.num_refs_publications_to_publications,
                s.num_refs_publications_to_people,
                s.num_refs_publications_to_timelines,
                s.num_refs_people_to_ideas,
                s.num_refs_people_to_publications,
                s.num_refs_people_to_people,
                s.num_refs_people_to_timelines,
                s.num_refs_timelines_to_ideas,
                s.num_refs_timelines_to_publications,
                s.num_refs_timelines_to_people,
                s.num_refs_timelines_to_timelines
         from stats s
         inner join (
                    select user_id, max(created_at) as latest_date
                    from stats
                    where user_id = $1
                    group by user_id
         ) slatest on s.user_id = slatest.user_id and s.created_at = slatest.latest_date",
        &[&user_id],
    )
    .await?;

    Ok(db_stats.into())
}

pub(crate) async fn generate_stats(db_pool: &Pool, user_id: Key) -> Result<interop::Stats> {
    info!("generate_stats");

    let mut client: Client = db_pool.get().await.map_err(Error::DeadPool)?;
    let tx = client.transaction().await?;

    let (
        num_ideas,
        num_publications,
        num_people,
        num_timelines,
        num_refs,
        num_cards,
        num_card_ratings,
        num_images,
        num_notes_in_ideas,
        num_notes_in_publications,
        num_notes_in_people,
        num_notes_in_timelines,
        num_points_in_people,
        num_points_in_timelines,
        num_refs_ideas_to_ideas,
        num_refs_ideas_to_publications,
        num_refs_ideas_to_people,
        num_refs_ideas_to_timelines,
        num_refs_publications_to_ideas,
        num_refs_publications_to_publications,
        num_refs_publications_to_people,
        num_refs_publications_to_timelines,
        num_refs_people_to_ideas,
        num_refs_people_to_publications,
        num_refs_people_to_people,
        num_refs_people_to_timelines,
        num_refs_timelines_to_ideas,
        num_refs_timelines_to_publications,
        num_refs_timelines_to_people,
        num_refs_timelines_to_timelines,
    ) = tokio::try_join!(
        get_num_decks(&tx, user_id, &"idea"),
        get_num_decks(&tx, user_id, &"publication"),
        get_num_decks(&tx, user_id, &"person"),
        get_num_decks(&tx, user_id, &"timeline"),
        get_num_refs(&tx, user_id),
        get_num_cards(&tx, user_id),
        get_num_card_ratings(&tx, user_id),
        get_num_images(&tx, user_id),
        get_num_notes_in_decks(&tx, user_id, &"idea"),
        get_num_notes_in_decks(&tx, user_id, &"publication"),
        get_num_notes_in_decks(&tx, user_id, &"person"),
        get_num_notes_in_decks(&tx, user_id, &"timeline"),
        get_num_points_in_decks(&tx, user_id, &"person"),
        get_num_points_in_decks(&tx, user_id, &"timeline"),
        get_num_refs_between(&tx, user_id, &"idea", &"idea"),
        get_num_refs_between(&tx, user_id, &"idea", &"publication"),
        get_num_refs_between(&tx, user_id, &"idea", &"person"),
        get_num_refs_between(&tx, user_id, &"idea", &"timeline"),
        get_num_refs_between(&tx, user_id, &"publication", &"idea"),
        get_num_refs_between(&tx, user_id, &"publication", &"publication"),
        get_num_refs_between(&tx, user_id, &"publication", &"person"),
        get_num_refs_between(&tx, user_id, &"publication", &"timeline"),
        get_num_refs_between(&tx, user_id, &"person", &"idea"),
        get_num_refs_between(&tx, user_id, &"person", &"publication"),
        get_num_refs_between(&tx, user_id, &"person", &"person"),
        get_num_refs_between(&tx, user_id, &"person", &"timeline"),
        get_num_refs_between(&tx, user_id, &"timeline", &"idea"),
        get_num_refs_between(&tx, user_id, &"timeline", &"publication"),
        get_num_refs_between(&tx, user_id, &"timeline", &"person"),
        get_num_refs_between(&tx, user_id, &"timeline", &"timeline")
    )?;

    tx.commit().await?;

    Ok(interop::Stats {
        num_ideas: num_ideas.into(),
        num_publications: num_publications.into(),
        num_people: num_people.into(),
        num_timelines: num_timelines.into(),

        num_refs: num_refs.into(),
        num_cards: num_cards.into(),
        num_card_ratings: num_card_ratings.into(),
        num_images: num_images.into(),

        num_notes_in_ideas: num_notes_in_ideas.into(),
        num_notes_in_publications: num_notes_in_publications.into(),
        num_notes_in_people: num_notes_in_people.into(),
        num_notes_in_timelines: num_notes_in_timelines.into(),

        num_points_in_people: num_points_in_people.into(),
        num_points_in_timelines: num_points_in_timelines.into(),

        num_refs_ideas_to_ideas: num_refs_ideas_to_ideas.into(),
        num_refs_ideas_to_publications: num_refs_ideas_to_publications.into(),
        num_refs_ideas_to_people: num_refs_ideas_to_people.into(),
        num_refs_ideas_to_timelines: num_refs_ideas_to_timelines.into(),

        num_refs_publications_to_ideas: num_refs_publications_to_ideas.into(),
        num_refs_publications_to_publications: num_refs_publications_to_publications.into(),
        num_refs_publications_to_people: num_refs_publications_to_people.into(),
        num_refs_publications_to_timelines: num_refs_publications_to_timelines.into(),

        num_refs_people_to_ideas: num_refs_people_to_ideas.into(),
        num_refs_people_to_publications: num_refs_people_to_publications.into(),
        num_refs_people_to_people: num_refs_people_to_people.into(),
        num_refs_people_to_timelines: num_refs_people_to_timelines.into(),

        num_refs_timelines_to_ideas: num_refs_timelines_to_ideas.into(),
        num_refs_timelines_to_publications: num_refs_timelines_to_publications.into(),
        num_refs_timelines_to_people: num_refs_timelines_to_people.into(),
        num_refs_timelines_to_timelines: num_refs_timelines_to_timelines.into(),
    })
}

pub(crate) async fn get_num_decks(
    tx: &Transaction<'_>,
    user_id: Key,
    deck_kind: &str,
) -> Result<Count> {
    let stmt =
        "SELECT count(*) as count FROM decks WHERE kind='$deck_kind'::deck_kind AND user_id = $1";
    let stmt = stmt.replace("$deck_kind", &deck_kind.to_string());

    pg::one::<Count>(&tx, &stmt, &[&user_id]).await
}

pub(crate) async fn get_num_refs(tx: &Transaction<'_>, user_id: Key) -> Result<Count> {
    pg::one::<Count>(&tx, "SELECT count(*) as count from notes_decks nd left join decks d on d.id = nd.deck_id WHERE d.user_id = $1", &[&user_id]).await
}

pub(crate) async fn get_num_cards(tx: &Transaction<'_>, user_id: Key) -> Result<Count> {
    pg::one::<Count>(
        &tx,
        "SELECT count(*) as count from cards where user_id = $1",
        &[&user_id],
    )
    .await
}

pub(crate) async fn get_num_card_ratings(tx: &Transaction<'_>, user_id: Key) -> Result<Count> {
    pg::one::<Count>(&tx, "SELECT count(*) as count from card_ratings cr left join cards c on c.id = cr.card_id where c.user_id = $1", &[&user_id]).await
}

pub(crate) async fn get_num_images(tx: &Transaction<'_>, user_id: Key) -> Result<Count> {
    pg::one::<Count>(
        &tx,
        "SELECT count(*) as count from images where user_id = $1",
        &[&user_id],
    )
    .await
}

pub(crate) async fn get_num_notes_in_decks(
    tx: &Transaction<'_>,
    user_id: Key,
    deck_kind: &str,
) -> Result<Count> {
    let stmt = "select count(*) as count from notes n left join decks d on d.id = n.deck_id where d.kind='$deck_kind'::deck_kind and n.user_id = $1";
    let stmt = stmt.replace("$deck_kind", &deck_kind.to_string());

    pg::one::<Count>(&tx, &stmt, &[&user_id]).await
}

pub(crate) async fn get_num_points_in_decks(
    tx: &Transaction<'_>,
    user_id: Key,
    deck_kind: &str,
) -> Result<Count> {
    let stmt = "select count(*) as count from points p left join decks d on d.id = p.deck_id where d.kind='$deck_kind'::deck_kind and d.user_id = $1";
    let stmt = stmt.replace("$deck_kind", &deck_kind.to_string());

    pg::one::<Count>(&tx, &stmt, &[&user_id]).await
}

pub(crate) async fn get_num_refs_between(
    tx: &Transaction<'_>,
    user_id: Key,
    deck_from: &str,
    deck_to: &str,
) -> Result<Count> {
    let stmt = "select count(*) as count
from notes_decks nd
     left join decks deck_to on deck_to.id = nd.deck_id
     left join notes n on n.id = nd.note_id
     left join decks deck_from on n.deck_id = deck_from.id
where deck_from.user_id = $1 and deck_from.kind='$deck_kind_from'::deck_kind and deck_to.kind='$deck_kind_to'::deck_kind";
    let stmt = stmt.replace("$deck_kind_from", &deck_from.to_string());
    let stmt = stmt.replace("$deck_kind_to", &deck_to.to_string());

    pg::one::<Count>(&tx, &stmt, &[&user_id]).await
}
