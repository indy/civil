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

use crate::error::Result;
use crate::interop::stats as interop;
use crate::interop::Key;

#[allow(unused_imports)]
use tracing::info;

use crate::db::sqlite::{self, SqlitePool};
use rusqlite::{Connection, Row, params};

pub fn sqlite_create_stats(sqlite_pool: &SqlitePool, user_id: Key, stats: &interop::Stats) -> Result<()> {
    info!("create_stats");

    let conn = sqlite_pool.get()?;

    sqlite::zero(
        &conn,
        "INSERT INTO stats(user_id,
                           num_ideas,
                           num_articles,
                           num_people,
                           num_timelines,
                           num_refs,
                           num_cards,
                           num_card_ratings,
                           num_images,
                           num_notes_in_ideas,
                           num_notes_in_articles,
                           num_notes_in_people,
                           num_notes_in_timelines,
                           num_points_in_people,
                           num_points_in_timelines,
                           num_refs_ideas_to_ideas,
                           num_refs_ideas_to_articles,
                           num_refs_ideas_to_people,
                           num_refs_ideas_to_timelines,
                           num_refs_articles_to_ideas,
                           num_refs_articles_to_articles,
                           num_refs_articles_to_people,
                           num_refs_articles_to_timelines,
                           num_refs_people_to_ideas,
                           num_refs_people_to_articles,
                           num_refs_people_to_people,
                           num_refs_people_to_timelines,
                           num_refs_timelines_to_ideas,
                           num_refs_timelines_to_articles,
                           num_refs_timelines_to_people,
                           num_refs_timelines_to_timelines)
         VALUES (      ?1,  ?2,  ?3,  ?4,  ?5,  ?6,  ?7,  ?8,  ?9,
                 ?10, ?11, ?12, ?13, ?14, ?15, ?16, ?17, ?18, ?19,
                 ?20, ?21, ?22, ?23, ?24, ?25, ?26, ?27, ?28, ?29,
                 ?30, ?31)",
        params![
            &user_id,
            &stats.num_ideas,
            &stats.num_articles,
            &stats.num_people,
            &stats.num_timelines,
            &stats.num_refs,
            &stats.num_cards,
            &stats.num_card_ratings,
            &stats.num_images,
            &stats.num_notes_in_ideas,
            &stats.num_notes_in_articles,
            &stats.num_notes_in_people,
            &stats.num_notes_in_timelines,
            &stats.num_points_in_people,
            &stats.num_points_in_timelines,
            &stats.num_refs_ideas_to_ideas,
            &stats.num_refs_ideas_to_articles,
            &stats.num_refs_ideas_to_people,
            &stats.num_refs_ideas_to_timelines,
            &stats.num_refs_articles_to_ideas,
            &stats.num_refs_articles_to_articles,
            &stats.num_refs_articles_to_people,
            &stats.num_refs_articles_to_timelines,
            &stats.num_refs_people_to_ideas,
            &stats.num_refs_people_to_articles,
            &stats.num_refs_people_to_people,
            &stats.num_refs_people_to_timelines,
            &stats.num_refs_timelines_to_ideas,
            &stats.num_refs_timelines_to_articles,
            &stats.num_refs_timelines_to_people,
            &stats.num_refs_timelines_to_timelines,
        ],
    )?;

    Ok(())
}

fn state_from_row(row: &Row) -> Result<interop::Stats> {
    Ok(interop::Stats {
        num_ideas: row.get(3)?,
        num_articles: row.get(4)?,
        num_people: row.get(5)?,
        num_timelines: row.get(6)?,

        num_refs: row.get(7)?,
        num_cards: row.get(8)?,
        num_card_ratings: row.get(9)?,
        num_images: row.get(10)?,

        num_notes_in_ideas: row.get(11)?,
        num_notes_in_articles: row.get(12)?,
        num_notes_in_people: row.get(13)?,
        num_notes_in_timelines: row.get(14)?,

        num_points_in_people: row.get(15)?,
        num_points_in_timelines: row.get(16)?,

        num_refs_ideas_to_ideas: row.get(17)?,
        num_refs_ideas_to_articles: row.get(18)?,
        num_refs_ideas_to_people: row.get(19)?,
        num_refs_ideas_to_timelines: row.get(20)?,

        num_refs_articles_to_ideas: row.get(21)?,
        num_refs_articles_to_articles: row.get(22)?,
        num_refs_articles_to_people: row.get(23)?,
        num_refs_articles_to_timelines: row.get(24)?,

        num_refs_people_to_ideas: row.get(25)?,
        num_refs_people_to_articles: row.get(26)?,
        num_refs_people_to_people: row.get(27)?,
        num_refs_people_to_timelines: row.get(28)?,

        num_refs_timelines_to_ideas: row.get(29)?,
        num_refs_timelines_to_articles: row.get(30)?,
        num_refs_timelines_to_people: row.get(31)?,
        num_refs_timelines_to_timelines: row.get(32)?,
    })
}

pub fn sqlite_get_last_saved_stats(sqlite_pool: &SqlitePool, user_id: Key) -> Result<interop::Stats> {
    let conn = sqlite_pool.get()?;

    sqlite::one(
        &conn,
        "select s.id,
                s.created_at,
                s.user_id,
                s.num_ideas,
                s.num_articles,
                s.num_people,
                s.num_timelines,
                s.num_refs,
                s.num_cards,
                s.num_card_ratings,
                s.num_images,
                s.num_notes_in_ideas,
                s.num_notes_in_articles,
                s.num_notes_in_people,
                s.num_notes_in_timelines,
                s.num_points_in_people,
                s.num_points_in_timelines,
                s.num_refs_ideas_to_ideas,
                s.num_refs_ideas_to_articles,
                s.num_refs_ideas_to_people,
                s.num_refs_ideas_to_timelines,
                s.num_refs_articles_to_ideas,
                s.num_refs_articles_to_articles,
                s.num_refs_articles_to_people,
                s.num_refs_articles_to_timelines,
                s.num_refs_people_to_ideas,
                s.num_refs_people_to_articles,
                s.num_refs_people_to_people,
                s.num_refs_people_to_timelines,
                s.num_refs_timelines_to_ideas,
                s.num_refs_timelines_to_articles,
                s.num_refs_timelines_to_people,
                s.num_refs_timelines_to_timelines
         from stats s
         inner join (
                    select user_id, max(created_at) as latest_date
                    from stats
                    where user_id = ?1
                    group by user_id
         ) slatest on s.user_id = slatest.user_id and s.created_at = slatest.latest_date",
        params![&user_id],
        state_from_row,
    )
}


fn i32_from_row(row: &Row) -> Result<i32> {
    Ok(row.get(0)?)
}

pub(crate) fn sqlite_get_num_decks(
    conn: &Connection,
    user_id: Key,
    deck_kind: &str,
) -> Result<i32> {
    let stmt =
        "SELECT count(*) as count FROM decks WHERE kind='$deck_kind' AND user_id = ?1";
    let stmt = stmt.replace("$deck_kind", &deck_kind.to_string());

    sqlite::one(&conn, &stmt, params![&user_id], i32_from_row)
}

pub(crate) fn sqlite_get_num_refs(conn: &Connection, user_id: Key) -> Result<i32> {
    sqlite::one(&conn,
                "SELECT count(*) as count from notes_decks nd left join decks d on d.id = nd.deck_id WHERE d.user_id = ?1",
                params![&user_id],
                i32_from_row)
}

pub(crate) fn sqlite_get_num_cards(conn: &Connection, user_id: Key) -> Result<i32> {
    sqlite::one(&conn,
                "SELECT count(*) as count from cards where user_id = ?1",
                params![&user_id],
                i32_from_row)
}

pub(crate) fn sqlite_get_num_card_ratings(conn: &Connection, user_id: Key) -> Result<i32> {
    sqlite::one(&conn,
                "SELECT count(*) as count from card_ratings cr left join cards c on c.id = cr.card_id where c.user_id = ?1",
                params![&user_id],
                i32_from_row)
}

pub(crate) fn sqlite_get_num_images(conn: &Connection, user_id: Key) -> Result<i32> {
    sqlite::one(&conn,
                "SELECT count(*) as count from images where user_id = ?1",
                params![&user_id],
                i32_from_row)
}

pub(crate) fn sqlite_get_num_notes_in_decks(
    conn: &Connection,
    user_id: Key,
    deck_kind: &str,
) -> Result<i32> {
    let stmt =
        "select count(*) as count from notes n left join decks d on d.id = n.deck_id where d.kind='$deck_kind' and n.user_id = ?1";
    let stmt = stmt.replace("$deck_kind", &deck_kind.to_string());

    sqlite::one(&conn, &stmt, params![&user_id], i32_from_row)
}

pub(crate) fn sqlite_get_num_points_in_decks(
    conn: &Connection,
    user_id: Key,
    deck_kind: &str,
) -> Result<i32> {
    let stmt =
        "select count(*) as count from points p left join decks d on d.id = p.deck_id where d.kind='$deck_kind' and d.user_id = ?1";
    let stmt = stmt.replace("$deck_kind", &deck_kind.to_string());

    sqlite::one(&conn, &stmt, params![&user_id], i32_from_row)
}

pub(crate) fn sqlite_get_num_refs_between(
    conn: &Connection,
    user_id: Key,
    deck_from: &str,
    deck_to: &str,
) -> Result<i32> {
    let stmt = "select count(*) as count
from notes_decks nd
     left join decks deck_to on deck_to.id = nd.deck_id
     left join notes n on n.id = nd.note_id
     left join decks deck_from on n.deck_id = deck_from.id
where deck_from.user_id = ?1 and deck_from.kind='$deck_kind_from' and deck_to.kind='$deck_kind_to'";
    let stmt = stmt.replace("$deck_kind_from", &deck_from.to_string());
    let stmt = stmt.replace("$deck_kind_to", &deck_to.to_string());

    sqlite::one(&conn, &stmt, params![&user_id], i32_from_row)
}


pub fn sqlite_generate_stats(sqlite_pool: &SqlitePool, user_id: Key) -> Result<interop::Stats> {
    info!("generate_stats");

    let conn = sqlite_pool.get()?;

    let num_ideas = sqlite_get_num_decks(&conn, user_id, &"idea")?;
    let num_articles = sqlite_get_num_decks(&conn, user_id, &"article")?;
    let num_people = sqlite_get_num_decks(&conn, user_id, &"person")?;
    let num_timelines = sqlite_get_num_decks(&conn, user_id, &"timeline")?;
    let num_refs = sqlite_get_num_refs(&conn, user_id)?;
    let num_cards = sqlite_get_num_cards(&conn, user_id)?;
    let num_card_ratings = sqlite_get_num_card_ratings(&conn, user_id)?;
    let num_images = sqlite_get_num_images(&conn, user_id)?;
    let num_notes_in_ideas = sqlite_get_num_notes_in_decks(&conn, user_id, &"idea")?;
    let num_notes_in_articles = sqlite_get_num_notes_in_decks(&conn, user_id, &"article")?;
    let num_notes_in_people = sqlite_get_num_notes_in_decks(&conn, user_id, &"person")?;
    let num_notes_in_timelines = sqlite_get_num_notes_in_decks(&conn, user_id, &"timeline")?;
    let num_points_in_people = sqlite_get_num_points_in_decks(&conn, user_id, &"person")?;
    let num_points_in_timelines = sqlite_get_num_points_in_decks(&conn, user_id, &"timeline")?;
    let num_refs_ideas_to_ideas = sqlite_get_num_refs_between(&conn, user_id, &"idea", &"idea")?;
    let num_refs_ideas_to_articles = sqlite_get_num_refs_between(&conn, user_id, &"idea", &"article")?;
    let num_refs_ideas_to_people = sqlite_get_num_refs_between(&conn, user_id, &"idea", &"person")?;
    let num_refs_ideas_to_timelines = sqlite_get_num_refs_between(&conn, user_id, &"idea", &"timeline")?;
    let num_refs_articles_to_ideas = sqlite_get_num_refs_between(&conn, user_id, &"article", &"idea")?;
    let num_refs_articles_to_articles = sqlite_get_num_refs_between(&conn, user_id, &"article", &"article")?;
    let num_refs_articles_to_people = sqlite_get_num_refs_between(&conn, user_id, &"article", &"person")?;
    let num_refs_articles_to_timelines = sqlite_get_num_refs_between(&conn, user_id, &"article", &"timeline")?;
    let num_refs_people_to_ideas = sqlite_get_num_refs_between(&conn, user_id, &"person", &"idea")?;
    let num_refs_people_to_articles = sqlite_get_num_refs_between(&conn, user_id, &"person", &"article")?;
    let num_refs_people_to_people = sqlite_get_num_refs_between(&conn, user_id, &"person", &"person")?;
    let num_refs_people_to_timelines = sqlite_get_num_refs_between(&conn, user_id, &"person", &"timeline")?;
    let num_refs_timelines_to_ideas = sqlite_get_num_refs_between(&conn, user_id, &"timeline", &"idea")?;
    let num_refs_timelines_to_articles = sqlite_get_num_refs_between(&conn, user_id, &"timeline", &"article")?;
    let num_refs_timelines_to_people = sqlite_get_num_refs_between(&conn, user_id, &"timeline", &"person")?;
    let num_refs_timelines_to_timelines = sqlite_get_num_refs_between(&conn, user_id, &"timeline", &"timeline")?;

    Ok(interop::Stats {
        num_ideas,
        num_articles,
        num_people,
        num_timelines,

        num_refs,
        num_cards,
        num_card_ratings,
        num_images,

        num_notes_in_ideas,
        num_notes_in_articles,
        num_notes_in_people,
        num_notes_in_timelines,

        num_points_in_people,
        num_points_in_timelines,

        num_refs_ideas_to_ideas,
        num_refs_ideas_to_articles,
        num_refs_ideas_to_people,
        num_refs_ideas_to_timelines,

        num_refs_articles_to_ideas,
        num_refs_articles_to_articles,
        num_refs_articles_to_people,
        num_refs_articles_to_timelines,

        num_refs_people_to_ideas,
        num_refs_people_to_articles,
        num_refs_people_to_people,
        num_refs_people_to_timelines,

        num_refs_timelines_to_ideas,
        num_refs_timelines_to_articles,
        num_refs_timelines_to_people,
        num_refs_timelines_to_timelines,
    })
}
