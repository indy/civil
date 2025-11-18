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

use rusqlite::{Connection, named_params};
use tracing::info;

use crate::db::{DbError, sqlite};
use crate::interop::Key;
use crate::interop::decks::DeckKind;

pub(crate) fn get_num_decks(
    conn: &Connection,
    user_id: Key,
    deck_kind: DeckKind,
) -> crate::Result<i32> {
    let stmt = "SELECT count(*) as count FROM decks WHERE kind=:deck_kind AND user_id = :user_id";

    sqlite::one(
        conn,
        &stmt,
        named_params! {":user_id": user_id, ":deck_kind": deck_kind},
    )
    .map_err(Into::into)
}

pub(crate) fn get_num_refs(conn: &Connection, user_id: Key) -> crate::Result<i32> {
    let stmt = "SELECT count(*) AS count
                FROM refs r LEFT JOIN decks d ON d.id = r.deck_id
                WHERE d.user_id = :user_id";
    sqlite::one(conn, stmt, named_params! {":user_id": user_id}).map_err(Into::into)
}

pub(crate) fn get_num_cards(conn: &Connection, user_id: Key) -> crate::Result<i32> {
    let stmt = "SELECT count(*) AS count FROM cards WHERE user_id = :user_id";
    sqlite::one(conn, stmt, named_params! {":user_id": user_id}).map_err(Into::into)
}

pub(crate) fn get_num_card_ratings(conn: &Connection, user_id: Key) -> crate::Result<i32> {
    let stmt = "SELECT count(*) AS count
                FROM card_ratings cr LEFT JOIN cards c ON c.id = cr.card_id
                WHERE c.user_id = :user_id";
    sqlite::one(conn, stmt, named_params! {":user_id": user_id}).map_err(Into::into)
}

pub(crate) fn get_num_images(conn: &Connection, user_id: Key) -> crate::Result<i32> {
    let stmt = "SELECT count(*) AS count FROM images WHERE user_id = :user_id";
    sqlite::one(conn, stmt, named_params! {":user_id": user_id}).map_err(Into::into)
}

pub(crate) fn get_num_notes_in_decks(
    conn: &Connection,
    user_id: Key,
    deck_kind: DeckKind,
) -> crate::Result<i32> {
    let stmt = "SELECT COUNT(*) AS count
                FROM notes n LEFT JOIN decks d ON d.id = n.deck_id
                WHERE d.kind = :deck_kind AND n.user_id = :user_id";

    sqlite::one(
        conn,
        &stmt,
        named_params! {":user_id": user_id, ":deck_kind": deck_kind},
    )
    .map_err(Into::into)
}

pub(crate) fn get_num_points_in_decks(
    conn: &Connection,
    user_id: Key,
    deck_kind: DeckKind,
) -> crate::Result<i32> {
    let stmt = "SELECT COUNT(*) AS count
                FROM points p LEFT JOIN decks d ON d.id = p.deck_id
                WHERE d.kind = :deck_kind AND d.user_id = :user_id";

    sqlite::one(
        conn,
        &stmt,
        named_params! {":user_id": user_id, ":deck_kind": deck_kind},
    )
    .map_err(Into::into)
}

pub(crate) fn get_num_refs_between(
    conn: &Connection,
    user_id: Key,
    deck_from: DeckKind,
    deck_to: DeckKind,
) -> crate::Result<i32> {
    let stmt = "SELECT COUNT(*) AS count
                FROM refs r
                LEFT JOIN decks deck_to ON deck_to.id = r.deck_id
                LEFT JOIN notes n ON n.id = r.note_id
                LEFT JOIN decks deck_from ON n.deck_id = deck_from.id
                WHERE deck_from.user_id = :user_id AND deck_from.kind = :deck_kind_from AND deck_to.kind = :deck_kind_to";

    sqlite::one(
        conn,
        &stmt,
        named_params! {
            ":user_id": user_id,
            ":deck_kind_from": deck_from,
            ":deck_kind_to": deck_to
        },
    )
    .map_err(Into::into)
}

pub fn generate_stats(conn: &Connection, user_id: Key) -> crate::Result<()> {
    info!("generate_stats");

    let num_refs = get_num_refs(conn, user_id)?;
    let num_cards = get_num_cards(conn, user_id)?;
    let num_card_ratings = get_num_card_ratings(conn, user_id)?;
    let num_images = get_num_images(conn, user_id)?;

    let id: Key = sqlite::one(
        conn,
        "INSERT INTO stats(user_id, num_refs, num_cards, num_card_ratings, num_images)
         VALUES(:user_id, :num_refs, :num_cards, :num_card_ratings, :num_images)
         RETURNING id",
        named_params![
            ":user_id": user_id,
            ":num_refs": num_refs,
            ":num_cards": num_cards,
            ":num_card_ratings": num_card_ratings,
            ":num_images": num_images
        ],
    )
    .map_err(|e: DbError| crate::Error::from(e))?;

    let deck_kinds = [
        DeckKind::Article,
        DeckKind::Person,
        DeckKind::Idea,
        DeckKind::Timeline,
        DeckKind::Quote,
        DeckKind::Dialogue,
        DeckKind::Event,
        DeckKind::Concept,
        DeckKind::Prediction,
    ];

    for deck_kind in deck_kinds {
        let num_decks = get_num_decks(conn, user_id, deck_kind)?;
        write_num_decks(conn, id, deck_kind, num_decks)?;

        let num_notes = get_num_notes_in_decks(conn, user_id, deck_kind)?;
        write_num_notes(conn, id, deck_kind, num_notes)?;
    }

    let deck_kinds_with_points = [DeckKind::Person, DeckKind::Timeline];
    for deck_kind in deck_kinds_with_points {
        let num_points = get_num_points_in_decks(conn, user_id, deck_kind)?;
        write_num_points(conn, id, deck_kind, num_points)?;
    }

    for y in deck_kinds {
        for x in deck_kinds {
            let num_refs = get_num_refs_between(conn, user_id, x, y)?;
            write_num_refs(conn, id, x, y, num_refs)?;
        }
    }

    Ok(())
}

fn write_num_decks(
    conn: &Connection,
    stats_id: Key,
    deck_kind: DeckKind,
    value: i32,
) -> crate::Result<()> {
    let stmt = "INSERT INTO stats_num_decks(stats_id, deck_kind, num_decks) VALUES (:stats_id, :deck_kind, :num_decks)";
    sqlite::zero(
        conn,
        stmt,
        named_params! {
            ":stats_id": stats_id,
            ":deck_kind": deck_kind,
            ":num_decks": value
        },
    )
    .map_err(Into::into)
}

fn write_num_notes(
    conn: &Connection,
    stats_id: Key,
    deck_kind: DeckKind,
    value: i32,
) -> crate::Result<()> {
    let stmt = "INSERT INTO stats_num_notes(stats_id, deck_kind, num_notes) VALUES (:stats_id, :deck_kind, :num_notes)";
    sqlite::zero(
        conn,
        stmt,
        named_params! {
            ":stats_id": stats_id,
            ":deck_kind": deck_kind,
            ":num_notes": value
        },
    )
    .map_err(Into::into)
}

fn write_num_points(
    conn: &Connection,
    stats_id: Key,
    deck_kind: DeckKind,
    value: i32,
) -> crate::Result<()> {
    let stmt = "INSERT INTO stats_num_points(stats_id, deck_kind, num_points) VALUES (:stats_id, :deck_kind, :num_points)";
    sqlite::zero(
        conn,
        stmt,
        named_params! {
            ":stats_id": stats_id,
            ":deck_kind": deck_kind,
            ":num_points": value
        },
    )
    .map_err(Into::into)
}

fn write_num_refs(
    conn: &Connection,
    stats_id: Key,
    from_deck_kind: DeckKind,
    to_deck_kind: DeckKind,
    value: i32,
) -> crate::Result<()> {
    let stmt = "INSERT INTO stats_num_refs(stats_id, from_deck_kind, to_deck_kind, num_refs) VALUES (:stats_id, :from, :to, :num_refs)";
    sqlite::zero(
        conn,
        stmt,
        named_params! {
            ":stats_id": stats_id,
            ":from": from_deck_kind,
            ":to": to_deck_kind,
            ":num_refs": value
        },
    )
    .map_err(Into::into)
}
