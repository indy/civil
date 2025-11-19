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
use crate::db::notes;
use crate::db::qry::Qry;
use crate::db::sqlite::{self, FromRow};
use crate::interop::Key;
use crate::interop::decks::{DeckKind, Hit, Pagination, SlimDeck};
use crate::interop::font::Font;
use rusqlite::{Connection, Row, named_params};

#[allow(unused_imports)]
use tracing::{info, warn};

pub(crate) enum DeckBaseOrigin {
    Created,
    PreExisting,
}

#[derive(Debug, Clone)]
pub struct DeckBase {
    pub id: Key,
    pub title: String,
    pub deck_kind: DeckKind,
    pub created_at: chrono::NaiveDateTime,
    pub graph_terminator: bool,
    pub insignia: i32,
    pub font: Font,
    pub impact: i32,
}

impl FromRow for SlimDeck {
    fn from_row(row: &Row) -> rusqlite::Result<SlimDeck> {
        Ok(SlimDeck {
            id: row.get("id")?,
            title: row.get("name")?,
            deck_kind: row.get("kind")?,
            created_at: row.get("created_at")?,
            graph_terminator: row.get("graph_terminator")?,
            insignia: row.get("insignia")?,
            font: row.get("font")?,
            impact: row.get("impact")?,
        })
    }
}

impl FromRow for DeckBase {
    fn from_row(row: &Row) -> rusqlite::Result<DeckBase> {
        Ok(DeckBase {
            id: row.get("id")?,
            title: row.get("name")?,
            deck_kind: row.get("kind")?,
            created_at: row.get("created_at")?,
            graph_terminator: row.get("graph_terminator")?,
            insignia: row.get("insignia")?,
            font: row.get("font")?,
            impact: row.get("impact")?,
        })
    }
}

impl FromRow for Hit {
    fn from_row(row: &Row) -> rusqlite::Result<Hit> {
        Ok(Hit {
            created_at: row.get("created_at")?,
        })
    }
}

impl FromRow for Font {
    fn from_row(row: &Row) -> rusqlite::Result<Font> {
        let font = row.get("font")?;
        Ok(font)
    }
}

pub(crate) fn recently_visited_any(
    conn: &rusqlite::Connection,
    user_id: Key,
    num: i32,
) -> Result<Vec<SlimDeck>, DbError> {
    sqlite::many(
        &conn,
        &Qry::select_decklike()
            .comma("max(hits.created_at) as most_recent_visit")
            .from("hits INNER JOIN decks as d ON d.id = hits.deck_id")
            .where_clause("d.user_id = :user_id")
            .group_by("hits.deck_id")
            .order_by("most_recent_visit DESC")
            .limit(),
        named_params! {
            ":user_id": user_id,
            ":limit": num
        },
    )
}

pub(crate) fn recently_visited(
    conn: &rusqlite::Connection,
    user_id: Key,
    deck_kind: DeckKind,
    num: i32,
) -> Result<Vec<SlimDeck>, DbError> {
    sqlite::many(
        &conn,
        &Qry::select_decklike()
            .comma("max(hits.created_at) as most_recent_visit")
            .from("hits INNER JOIN decks as d ON d.id = hits.deck_id")
            .where_clause("d.user_id = :user_id AND d.kind= :deck_kind")
            .group_by("hits.deck_id")
            .order_by("most_recent_visit DESC")
            .limit(),
        named_params! {
            ":user_id": user_id,
            ":deck_kind": deck_kind,
            ":limit": num
        },
    )
}

fn num_decks_for_deck_kind(
    conn: &rusqlite::Connection,
    user_id: Key,
    deck_kind: DeckKind,
) -> Result<i32, DbError> {
    sqlite::one(
        &conn,
        &Qry::query_count_decklike(),
        named_params! {
            ":user_id": user_id,
            ":deck_kind": deck_kind,
        },
    )
}

pub(crate) fn pagination(
    conn: &rusqlite::Connection,
    user_id: Key,
    deck_kind: DeckKind,
    offset: i32,
    num_items: i32,
) -> Result<Pagination<SlimDeck>, DbError> {
    let items = sqlite::many(
        &conn,
        &Qry::select_decklike()
            .from_decklike()
            .where_decklike_but_no_deck_id()
            .order_by("d.created_at DESC")
            .limit()
            .offset(),
        named_params! {
            ":user_id": user_id,
            ":deck_kind": deck_kind,
            ":limit": num_items,
            ":offset": offset
        },
    )?;

    let total_items = num_decks_for_deck_kind(conn, user_id, deck_kind)?;

    let res = Pagination::<SlimDeck> { items, total_items };

    Ok(res)
}

pub(crate) fn pagination_events_chronologically(
    conn: &rusqlite::Connection,
    user_id: Key,
    deck_kind: DeckKind,
    offset: i32,
    num_items: i32,
) -> Result<Pagination<SlimDeck>, DbError> {
    let items = sqlite::many(
        &conn,
        &Qry::select_decklike()
            .from_decklike()
            .left_join("points AS p ON p.deck_id = d.id")
            .where_decklike_but_no_deck_id()
            .order_by("(p.exact_realdate IS NOT NULL OR p.lower_realdate IS NOT NULL OR p.upper_realdate IS NOT NULL),
                COALESCE(p.exact_realdate, p.lower_realdate, p.upper_realdate) DESC")
        .limit()
        .offset(),
        named_params! {
            ":user_id": user_id,
            ":deck_kind": deck_kind,
            ":limit": num_items,
            ":offset": offset
        },
    )?;

    let total_items = num_decks_for_deck_kind(conn, user_id, deck_kind)?;

    let res = Pagination::<SlimDeck> { items, total_items };

    Ok(res)
}

// note: may execute multiple sql write statements so should be in a transaction
//
// returns tuple where the second element is a bool indicating whether the deck
// was created (true) or we're returning a pre-existing deck (false)
//
pub(crate) fn deckbase_get_or_create(
    tx: &Connection,
    user_id: Key,
    kind: DeckKind,
    name: &str,
    graph_terminator: bool,
    insignia: i32,
    font: Font,
    impact: i32,
) -> Result<(DeckBase, DeckBaseOrigin), DbError> {
    let existing_deck_res = deckbase_get_by_name(tx, user_id, kind, name);

    match existing_deck_res {
        Ok(deck) => Ok((deck, DeckBaseOrigin::PreExisting)),
        Err(e) => match e {
            DbError::Sqlite(rusqlite::Error::QueryReturnedNoRows) => {
                let deck = deckbase_create(
                    tx,
                    user_id,
                    kind,
                    name,
                    graph_terminator,
                    insignia,
                    font,
                    impact,
                )?;
                Ok((deck, DeckBaseOrigin::Created))
            }
            _ => Err(e),
        },
    }
}

pub(crate) fn hit(conn: &Connection, deck_id: Key) -> Result<(), DbError> {
    let stmt = "INSERT INTO hits(deck_id) VALUES (:deck_id)";
    sqlite::zero(conn, stmt, named_params! {":deck_id": deck_id})
}

pub(crate) fn get_hits(conn: &rusqlite::Connection, deck_id: Key) -> Result<Vec<Hit>, DbError> {
    let stmt = "SELECT created_at FROM hits WHERE deck_id = :deck_id ORDER BY created_at DESC;";
    sqlite::many(conn, stmt, named_params! {":deck_id": deck_id})
}

fn deckbase_get_by_name(
    conn: &Connection,
    user_id: Key,
    kind: DeckKind,
    name: &str,
) -> Result<DeckBase, DbError> {
    sqlite::one(
        conn,
        &Qry::select_decklike()
            .from_decklike()
            .where_decklike_but_no_deck_id()
            .and("d.name = :name"),
        named_params! {":user_id": user_id, ":name": name, ":deck_kind": kind},
    )
}

pub(crate) fn deckbase_create(
    tx: &Connection,
    user_id: Key,
    kind: DeckKind,
    name: &str,
    graph_terminator: bool,
    insignia: i32,
    font: Font,
    impact: i32,
) -> Result<DeckBase, DbError> {
    let stmt = "INSERT INTO decks(user_id, kind, name, graph_terminator, insignia, font, impact)
                VALUES (:user_id, :deck_kind, :name, :graph_terminator, :insignia, :font, :impact)
                RETURNING id, name, kind, created_at, graph_terminator, insignia, font, impact";

    let deckbase: DeckBase = sqlite::one(
        tx,
        stmt,
        named_params! {
            ":user_id": user_id,
            ":deck_kind": kind,
            ":name": name,
            ":graph_terminator": graph_terminator,
            ":insignia": insignia,
            ":font": font,
            ":impact": impact
        },
    )?;

    // create the mandatory NoteKind::NoteDeckMeta
    let _note = notes::create_note_deck_meta(tx, user_id, deckbase.id)?;

    Ok(deckbase)
}

pub(crate) fn deckbase_edit(
    tx: &Connection,
    user_id: Key,
    deck_id: Key,
    kind: DeckKind,
    name: &str,
    graph_terminator: bool,
    insignia: i32,
    font: Font,
    impact: i32,
) -> Result<DeckBase, DbError> {
    // if the font has changed
    let original_font = get_font_of_deck(tx, deck_id)?;

    if original_font != font {
        // change all of this deck's notes that have the old font to the new font
        notes::replace_note_fonts(tx, user_id, deck_id, original_font, font)?;
    }

    let stmt = "UPDATE decks
                SET name = :name, graph_terminator = :graph_terminator, insignia = :insignia, font = :font, impact = :impact
                WHERE user_id = :user_id AND id = :deck_id AND kind = :deck_kind
                RETURNING id, name, kind, created_at, graph_terminator, insignia, font, impact";

    sqlite::one(
        tx,
        stmt,
        named_params! {
            ":user_id": user_id,
            ":deck_id": deck_id,
            ":deck_kind": kind,
            ":name": name,
            ":graph_terminator": graph_terminator,
            ":insignia": insignia,
            ":font": font,
            ":impact": impact
        },
    )
}

pub(crate) fn insignia_filter(
    conn: &rusqlite::Connection,
    user_id: Key,
    deck_kind: DeckKind,
    insignia: i32,
    offset: i32,
    num_items: i32,
) -> Result<Pagination<SlimDeck>, DbError> {
    let items = sqlite::many(
        &conn,
        &Qry::select_decklike()
            .from_decklike()
            .where_decklike_but_no_deck_id()
            .and("d.insignia & :insignia")
            .order_by("d.created_at DESC")
            .limit()
            .offset(),
        named_params! {
            ":user_id": user_id,
            ":insignia": insignia,
            ":deck_kind": deck_kind,
            ":limit": num_items,
            ":offset": offset
        },
    )?;

    let total_items = sqlite::one(
        &conn,
        &Qry::query_count_decklike().and("d.insignia & :insignia"),
        named_params! {":user_id": user_id, ":insignia": insignia, ":deck_kind": deck_kind},
    )?;

    let res = Pagination::<SlimDeck> { items, total_items };

    Ok(res)
}

pub(crate) fn insignia_filter_any(
    conn: &rusqlite::Connection,
    user_id: Key,
    insignia: i32,
    offset: i32,
    num_items: i32,
) -> Result<Pagination<SlimDeck>, DbError> {
    let items = sqlite::many(
        &conn,
        &Qry::select_decklike()
            .from_decklike()
            .where_clause("user_id = :user_id AND d.insignia & :insignia")
            .order_by("d.created_at DESC")
            .limit()
            .offset(),
        named_params! {":user_id": user_id, ":insignia": insignia, ":limit": num_items, ":offset": offset},
    )?;

    let total_items = sqlite::one(
        &conn,
        &Qry::select_count().from_decklike().where_clause("d.user_id = :user_id AND d.insignia & :insignia;"),
        named_params! {":user_id": user_id, ":insignia": insignia},
    )?;

    let res = Pagination::<SlimDeck> { items, total_items };

    Ok(res)
}

pub(crate) fn recent(
    conn: &rusqlite::Connection,
    user_id: Key,
    deck_kind: DeckKind,
) -> Result<Vec<SlimDeck>, DbError> {
    sqlite::many(
        &conn,
        &Qry::select_decklike()
            .from_decklike()
            .where_decklike_but_no_deck_id()
            .order_by("d.created_at DESC")
            .limit(),
        named_params! {":user_id": user_id, ":deck_kind": deck_kind, ":limit": 10},
    )
}

// delete anything that's represented as a deck (article, person, idea, timeline, quote, dialogue)
//
pub(crate) fn delete(conn: &Connection, user_id: Key, id: Key) -> Result<(), DbError> {
    sqlite::zero(
        &conn,
        "DELETE FROM decks WHERE id = :id and user_id = :user_id",
        named_params! {":user_id": user_id, ":id": id},
    )?;

    Ok(())
}

fn get_font_of_deck(conn: &Connection, deck_id: Key) -> Result<Font, DbError> {
    sqlite::one(
        conn,
        "SELECT font FROM decks WHERE id = :id",
        named_params! {":id": deck_id},
    )
}

pub(crate) fn overwrite_deck_font(
    conn: &Connection,
    user_id: Key,
    deck_id: Key,
    new_font: Font,
) -> Result<(), DbError> {
    sqlite::zero(
        conn,
        "UPDATE decks
         SET font = :font
         WHERE user_id = :user_id AND id = :id AND font <> :font",
        named_params! {":user_id": user_id, ":id": deck_id, ":font": new_font},
    )
}

pub(crate) fn paginated_unnoted(
    conn: &rusqlite::Connection,
    user_id: Key,
    deck_kind: DeckKind,
    offset: i32,
    num_items: i32,
) -> Result<Pagination<SlimDeck>, DbError> {
    let items = sqlite::many(
        &conn,
        &Qry::select_decklike()
            .from_decklike()
            .left_join("notes n ON (d.id = n.deck_id AND n.kind != 4)")
            .where_decklike_but_no_deck_id()
            .and("n.deck_id IS NULL")
            .order_by("d.created_at DESC")
            .limit()
            .offset(),
        named_params! {
            ":user_id": user_id,
            ":deck_kind": deck_kind,
            ":limit": num_items,
            ":offset": offset,
        },
    )?;

    let total_items = sqlite::one(
        &conn,
        &Qry::select_count()
            .from_decklike()
            .left_join("notes n ON (d.id = n.deck_id AND n.kind != 4)")
            .where_decklike_but_no_deck_id()
            .and("n.deck_id IS NULL"),
        named_params! {
            ":user_id": user_id,
            ":deck_kind": deck_kind,
        },
    )?;

    let res = Pagination::<SlimDeck> { items, total_items };

    Ok(res)
}

pub(crate) fn paginated_recents(
    conn: &rusqlite::Connection,
    user_id: Key,
    deck_kind: DeckKind,
    offset: i32,
    num_items: i32,
) -> Result<Pagination<SlimDeck>, DbError> {
    let items = sqlite::many(
        &conn,
        &Qry::select_decklike()
            .from_decklike()
            .where_decklike_but_no_deck_id()
            .order_by("d.created_at DESC")
            .limit()
            .offset(),
        named_params! {
            ":deck_kind": deck_kind,
            ":user_id": user_id,
            ":limit": num_items,
            ":offset": offset,
        },
    )?;

    let total_items = sqlite::one(
        &conn,
        &Qry::query_count_decklike(),
        named_params! {
            ":user_id": user_id,
            ":deck_kind": deck_kind,
        },
    )?;

    let res = Pagination::<SlimDeck> { items, total_items };

    Ok(res)
}

pub(crate) fn paginated_orphans(
    conn: &rusqlite::Connection,
    user_id: Key,
    deck_kind: DeckKind,
    offset: i32,
    num_items: i32,
) -> Result<Pagination<SlimDeck>, DbError> {
    let items = sqlite::many(
        &conn,
        &Qry::select_decklike()
            .from_decklike()
            .where_decklike_but_no_deck_id()
            .and("d.id NOT IN (SELECT deck_id FROM refs GROUP BY deck_id)")
            .and("d.id NOT IN (SELECT n.deck_id FROM notes n INNER JOIN refs r ON n.id = r.note_id GROUP BY n.deck_id)")
            .order_by("d.created_at DESC")
            .limit()
            .offset(),
        named_params! {
            ":user_id": user_id,
            ":deck_kind": deck_kind,
            ":limit": num_items,
            ":offset": offset
        },
    )?;

    let total_items = sqlite::one(
        &conn,
        &Qry::select_count()
            .from_decklike()
            .where_decklike_but_no_deck_id()
            .and("d.id NOT IN (SELECT deck_id FROM refs GROUP BY deck_id)")
            .and("d.id NOT IN (SELECT n.deck_id FROM notes n INNER JOIN refs r ON n.id = r.note_id GROUP BY n.deck_id)"),
        named_params! {
            ":user_id": user_id,
            ":deck_kind": deck_kind,
        })?;

    let res = Pagination::<SlimDeck> { items, total_items };

    Ok(res)
}

pub(crate) fn paginated_rated(
    conn: &rusqlite::Connection,
    user_id: Key,
    deck_kind: DeckKind,
    offset: i32,
    num_items: i32,
) -> Result<Pagination<SlimDeck>, DbError> {
    let items = sqlite::many(
        &conn,
        &Qry::select_decklike()
            .from_decklike()
            .where_decklike_but_no_deck_id()
            .and("d.impact > 0")
            .order_by("d.impact desc, d.id desc")
            .limit()
            .offset(),
        named_params! {
            ":user_id": user_id,
            ":deck_kind": deck_kind,
            ":limit": num_items,
            ":offset": offset,
        },
    )?;

    let total_items = sqlite::one(
        &conn,
        &Qry::select_count()
            .from_decklike()
            .where_decklike_but_no_deck_id()
            .and("d.impact > 0"),
        named_params! {
            ":user_id": user_id,
            ":deck_kind": deck_kind,
        },
    )?;

    let res = Pagination::<SlimDeck> { items, total_items };

    Ok(res)
}
