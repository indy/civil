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

use crate::db::DbError;
use crate::db::decks;
use crate::db::notes as notes_db;
use crate::db::points as points_db;
use crate::db::qry::Qry;
use crate::db::sqlite::{self, FromRow};
use crate::interop::Key;
use crate::interop::decks::{DeckKind, Pagination, ProtoSlimDeck, SlimDeck};
use crate::interop::font::Font;
use crate::interop::people::Person;
use rusqlite::{Row, named_params};

#[allow(unused_imports)]
use tracing::{error, info};

impl FromRow for Person {
    fn from_row(row: &Row) -> rusqlite::Result<Person> {
        Ok(Person {
            id: row.get("id")?,
            title: row.get("name")?,
            deck_kind: row.get("kind")?,
            created_at: row.get("created_at")?,
            graph_terminator: row.get("graph_terminator")?,
            insignia: row.get("insignia")?,
            font: row.get("font")?,
            impact: row.get("impact")?,
            sort_date: row.get("birth_date")?,

            points: vec![],
            notes: vec![],
            arrivals: vec![],
        })
    }
}

pub(crate) fn get_or_create(
    conn: &mut rusqlite::Connection,
    user_id: Key,
    title: String,
) -> Result<Person, DbError> {
    let tx = conn.transaction()?;

    let (deck, _origin) = decks::deckbase_get_or_create(
        &tx,
        user_id,
        DeckKind::Person,
        &title,
        false,
        0,
        Font::Serif,
        1,
    )?;

    tx.commit()?;

    let mut person: Person = deck.into();

    person.points = points_db::all_points_during_life(conn, user_id, person.id)?;
    person.notes = notes_db::notes_for_deck(conn, person.id)?;
    person.arrivals = notes_db::arrivals_for_deck(conn, person.id)?;

    Ok(person)
}

pub(crate) fn all(conn: &rusqlite::Connection, user_id: Key) -> Result<Vec<Person>, DbError> {
    sqlite::many(
        &conn,
        &Qry::new("")
            .select_decklike_inline()
            .comma("coalesce(date(p.exact_realdate), date(p.lower_realdate)) as birth_date")
            .from_decklike()
            .join("points p ON p.deck_id = d.id")
            .where_decklike_but_no_deck_id()
            .and("p.kind = 'point_begin'")
            .union()
            .select_decklike_inline()
            .comma("null as birth_date")
            .from_decklike()
            .left_join("points p ON p.deck_id = d.id")
            .where_decklike_but_no_deck_id()
            .and("p.deck_id is null")
            .order_by("birth_date"),
        named_params! {":user_id": user_id, ":deck_kind": DeckKind::Person},
    )
}

pub(crate) fn paginated_uncategorised(
    conn: &rusqlite::Connection,
    user_id: Key,
    offset: i32,
    num_items: i32,
) -> Result<Pagination<SlimDeck>, DbError> {
    let items = sqlite::many(
        &conn,
        &Qry::select_decklike()
            .comma("null as birth_date")
            .from_decklike()
            .left_join("points p ON p.deck_id = d.id")
            .where_decklike_but_no_deck_id()
            .and("p.deck_id is null")
            .limit()
            .offset(),
        named_params! {":user_id": user_id, ":deck_kind": DeckKind::Person, ":limit": num_items, ":offset": offset},
    )?;

    let total_items = sqlite::one(
        &conn,
        &Qry::select_count()
            .from_decklike()
            .left_join("points p ON p.deck_id = d.id")
            .where_decklike_but_no_deck_id()
            .and("p.deck_id is null"),
        named_params! {":user_id": user_id, ":deck_kind": DeckKind::Person},
    )?;

    let res = Pagination::<SlimDeck> { items, total_items };

    Ok(res)
}

pub(crate) fn paginated_ancient(
    conn: &rusqlite::Connection,
    user_id: Key,
    offset: i32,
    num_items: i32,
) -> Result<Pagination<SlimDeck>, DbError> {
    // the "-" seems to capture all of the early dates, some of the other formats that should work, don't.
    // So sticking with this for the moment
    paginated_date_period(conn, user_id, "-", "0354-01-01", offset, num_items)
}

pub(crate) fn paginated_medieval(
    conn: &rusqlite::Connection,
    user_id: Key,
    offset: i32,
    num_items: i32,
) -> Result<Pagination<SlimDeck>, DbError> {
    paginated_date_period(conn, user_id, "0354-01-01", "1469-01-01", offset, num_items)
}

pub(crate) fn paginated_modern(
    conn: &rusqlite::Connection,
    user_id: Key,
    offset: i32,
    num_items: i32,
) -> Result<Pagination<SlimDeck>, DbError> {
    paginated_date_period(conn, user_id, "1469-01-01", "1856-01-01", offset, num_items)
}

pub(crate) fn paginated_contemporary(
    conn: &rusqlite::Connection,
    user_id: Key,
    offset: i32,
    num_items: i32,
) -> Result<Pagination<SlimDeck>, DbError> {
    paginated_date_period(conn, user_id, "1856-01-01", "2356-01-01", offset, num_items)
}

pub(crate) fn get(
    conn: &rusqlite::Connection,
    user_id: Key,
    person_id: Key,
) -> Result<Option<Person>, DbError> {
    let mut person: Option<Person> = sqlite::one_optional(
        &conn,
        &Qry::select_decklike()
            .comma("null as birth_date")
            .from_decklike()
            .where_decklike(),
        named_params! {":user_id": user_id, ":deck_id": person_id, ":deck_kind": DeckKind::Person},
    )?;

    if let Some(ref mut p) = person {
        p.points = points_db::all_points_during_life(conn, user_id, person_id)?;
        p.notes = notes_db::notes_for_deck(conn, person_id)?;
        p.arrivals = notes_db::arrivals_for_deck(conn, person_id)?;
        decks::hit(&conn, person_id)?;
    }

    Ok(person)
}

pub(crate) fn edit(
    conn: &mut rusqlite::Connection,
    user_id: Key,
    person: ProtoSlimDeck,
    person_id: Key,
) -> Result<Person, DbError> {
    let tx = conn.transaction()?;

    let deck = decks::deckbase_edit(
        &tx,
        user_id,
        person_id,
        DeckKind::Person,
        &person.title,
        person.graph_terminator,
        person.insignia,
        person.font,
        person.impact,
    )?;

    tx.commit()?;

    let mut person: Person = deck.into();

    person.points = points_db::all_points_during_life(conn, user_id, person.id)?;
    person.notes = notes_db::notes_for_deck(conn, person_id)?;
    person.arrivals = notes_db::arrivals_for_deck(conn, person_id)?;

    Ok(person)
}

fn paginated_date_period(
    conn: &rusqlite::Connection,
    user_id: Key,
    from_date: &str,
    until_date: &str,
    offset: i32,
    num_items: i32,
) -> Result<Pagination<SlimDeck>, DbError> {
    let items = sqlite::many(
        &conn,
        &Qry::select_decklike()
            .comma("null as sort_date")
            .comma("COALESCE(date(p.exact_realdate), date(p.lower_realdate)) AS birth_date")
            .from_decklike()
            .join("points p ON p.deck_id = d.id")
            .where_decklike_but_no_deck_id()
            .and("p.kind = 'point_begin'")
            .and("birth_date >= :from_date AND birth_date < :until_date")
            .order_by("COALESCE(p.exact_realdate, p.lower_realdate)")
            .limit()
            .offset(),
        named_params! {":user_id": user_id, ":deck_kind": DeckKind::Person, ":from_date": from_date, ":until_date": until_date, ":limit": num_items, ":offset": offset},
    )?;

    let total_items = sqlite::one(
        &conn,
        &Qry::select_count()
            .from_nested(&Qry::select("COALESCE(date(p.exact_realdate), date(p.lower_realdate)) AS birth_date")
                         .from_decklike().join("points p ON p.deck_id = d.id")
                         .where_decklike_but_no_deck_id()
                         .and("p.kind = 'point_begin'")
                         .and("birth_date >= :from_date AND birth_date < :until_date")),
        named_params! {":user_id": user_id, ":deck_kind": DeckKind::Person, ":from_date": from_date, ":until_date": until_date},
    )?;

    let res = Pagination::<SlimDeck> { items, total_items };

    Ok(res)
}
