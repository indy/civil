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

use crate::db::notes;
use crate::db::points;
use crate::db::sqlite::{self, SqlitePool};
use crate::error::{Error, Result};
use crate::interop::decks as interop;
use crate::interop::decks::DeckKind;
use crate::interop::notes as note_interop;
use crate::interop::Key;
use rusqlite::{params, Connection, Row};

use std::str::FromStr;
#[allow(unused_imports)]
use tracing::{info, warn};

pub(crate) enum DeckBaseOrigin {
    Created,
    PreExisting,
}

fn contains(backrefs: &[interop::DeckSimple], id: Key) -> bool {
    for br in backrefs {
        if br.id == id {
            return true;
        }
    }
    false
}

fn resource_string_to_deck_kind_string(resource: &str) -> Result<&'static str> {
    match resource {
        "events" => Ok("event"),
        "ideas" => Ok("idea"),
        "people" => Ok("person"),
        "articles" => Ok("article"),
        _ => Err(Error::InvalidResource),
    }
}

#[derive(Debug, Clone)]
pub struct DeckBase {
    pub id: Key,
    pub name: String,
    pub created_at: chrono::NaiveDateTime,
    pub graph_terminator: bool,
    pub insignia: i32,
}

fn deckbase_from_row(row: &Row) -> Result<DeckBase> {
    Ok(DeckBase {
        id: row.get(0)?,
        name: row.get(1)?,
        created_at: row.get(2)?,
        graph_terminator: row.get(3)?,
        insignia: row.get(4)?,
    })
}

pub(crate) fn decksimple_from_row(row: &Row) -> Result<interop::DeckSimple> {
    let res: String = row.get(2)?;
    Ok(interop::DeckSimple {
        id: row.get(0)?,
        name: row.get(1)?,
        resource: DeckKind::from_str(&res)?,
        insignia: row.get(3)?,
    })
}

pub(crate) const DECKBASE_QUERY: &str = "select id, name, created_at, graph_terminator, insignia
                                         from decks
                                         where user_id = ?1 and id = ?2 and kind = ?3";

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
) -> Result<(DeckBase, DeckBaseOrigin)> {
    let existing_deck_res = deckbase_get_by_name(tx, user_id, kind, name);
    match existing_deck_res {
        Ok(deck) => Ok((deck, DeckBaseOrigin::PreExisting)),
        Err(e) => match e {
            Error::NotFound => {
                let deck = deckbase_create(tx, user_id, kind, name)?;
                Ok((deck, DeckBaseOrigin::Created))
            }
            _ => Err(e),
        },
    }
}

pub(crate) fn hit(conn: &Connection, deck_id: Key) -> Result<()> {
    let stmt = "INSERT INTO hits(deck_id) VALUES (?1)";
    sqlite::zero(conn, stmt, params![&deck_id])
}

fn deckbase_get_by_name(
    conn: &Connection,
    user_id: Key,
    kind: DeckKind,
    name: &str,
) -> Result<DeckBase> {
    let stmt = "SELECT id, name, created_at, graph_terminator, insignia
                FROM DECKS
                WHERE user_id = ?1 AND name = ?2 AND kind = ?3";
    sqlite::one(
        conn,
        stmt,
        params![&user_id, &name, &kind.to_string()],
        deckbase_from_row,
    )
}

// note: will execute multiple sql write statements so should be in a transaction
//
fn deckbase_create(tx: &Connection, user_id: Key, kind: DeckKind, name: &str) -> Result<DeckBase> {
    let graph_terminator = false;
    let stmt = "INSERT INTO decks(user_id, kind, name, graph_terminator, insignia)
                VALUES (?1, ?2, ?3, ?4, ?5)
                RETURNING id, name, created_at, graph_terminator, insignia";
    let insignia: i32 = 0;
    let deckbase: DeckBase = sqlite::one(
        tx,
        stmt,
        params![&user_id, &kind.to_string(), name, graph_terminator, &insignia],
        deckbase_from_row,
    )?;

    // create the mandatory NoteKind::NoteDeckMeta
    let _note = notes::create_note_deck_meta(tx, user_id, deckbase.id)?;

    Ok(deckbase)
}

pub(crate) fn deckbase_edit(
    conn: &Connection,
    user_id: Key,
    deck_id: Key,
    kind: DeckKind,
    name: &str,
    graph_terminator: bool,
    insignia: i32,
) -> Result<DeckBase> {
    let stmt = "UPDATE decks
                SET name = ?4, graph_terminator = ?5, insignia = ?6
                WHERE user_id = ?1 AND id = ?2 AND kind = ?3
                RETURNING id, name, created_at, graph_terminator, insignia";
    sqlite::one(
        conn,
        stmt,
        params![
            &user_id,
            &deck_id,
            &kind.to_string(),
            name,
            graph_terminator,
            insignia
        ],
        deckbase_from_row,
    )
}

pub(crate) fn recent(
    sqlite_pool: &SqlitePool,
    user_id: Key,
    resource: &str,
) -> Result<Vec<interop::DeckSimple>> {
    let conn = sqlite_pool.get()?;
    let deck_kind = resource_string_to_deck_kind_string(resource)?;
    let limit: i32 = 10;

    let stmt = "SELECT id, name, kind, insignia
                FROM decks
                WHERE user_id = ?1 AND kind = '$deck_kind'
                ORDER BY created_at DESC
                LIMIT $limit";
    let stmt = stmt.replace("$deck_kind", deck_kind);
    let stmt = stmt.replace("$limit", &limit.to_string());

    sqlite::many(&conn, &stmt, params![&user_id], decksimple_from_row)
}

// delete anything that's represented as a deck (article, person, event)
//
pub(crate) fn delete(sqlite_pool: &SqlitePool, user_id: Key, id: Key) -> Result<()> {
    let mut conn = sqlite_pool.get()?;
    let tx = conn.transaction()?;

    notes::delete_all_notes_connected_with_deck(&tx, user_id, id)?;

    sqlite::zero(
        &tx,
        "DELETE FROM article_extras WHERE deck_id = ?1",
        params![&id],
    )?;
    sqlite::zero(
        &tx,
        "DELETE FROM quote_extras WHERE deck_id = ?1",
        params![&id],
    )?;
    sqlite::zero(
        &tx,
        "DELETE FROM notes_decks WHERE deck_id = ?1",
        params![&id],
    )?;

    points::delete_all_points_connected_with_deck(&tx, id)?;

    sqlite::zero(
        &tx,
        "DELETE FROM decks WHERE id = ?2 and user_id = ?1",
        params![&user_id, &id],
    )?;

    tx.commit()?;

    Ok(())
}

// return all notes that have references back to the currently displayed deck
//
pub(crate) fn get_backnotes(
    sqlite_pool: &SqlitePool,
    deck_id: Key,
) -> Result<Vec<interop::BackNote>> {
    let conn = sqlite_pool.get()?;

    fn backnote_from_row(row: &Row) -> Result<interop::BackNote> {
        let kind: String = row.get(2)?;
        let sql_note_kind: i32 = row.get(5)?;

        Ok(interop::BackNote {
            note_id: row.get(4)?,
            note_content: row.get(3)?,
            note_kind: note_interop::note_kind_from_sqlite(sql_note_kind)?,
            deck_id: row.get(0)?,
            deck_name: row.get(1)?,
            resource: DeckKind::from_str(&kind)?,
        })
    }

    let stmt = "SELECT d.id AS deck_id,
                       d.name AS deck_name,
                       d.kind as kind,
                       n.content as note_content,
                       n.id as note_id,
                       n.kind as note_kind
                FROM decks d,
                     notes n,
                     notes_decks nd
                WHERE n.deck_id = d.id
                      AND nd.note_id = n.id
                      AND nd.deck_id = ?1
                ORDER BY d.name, n.id";
    sqlite::many(&conn, stmt, params![&deck_id], backnote_from_row)
}

// all refs on notes that have at least one ref back to the currently displayed deck
//
pub(crate) fn get_backrefs(
    sqlite_pool: &SqlitePool,
    deck_id: Key,
) -> Result<Vec<interop::BackRef>> {
    let conn = sqlite_pool.get()?;

    fn backref_from_row(row: &Row) -> Result<interop::BackRef> {
        let kind: String = row.get(2)?;
        let refk: String = row.get(4)?;

        Ok(interop::BackRef {
            note_id: row.get(0)?,
            deck_id: row.get(1)?,
            deck_name: row.get(3)?,
            resource: DeckKind::from_str(&kind)?,
            ref_kind: interop::RefKind::from_str(&refk)?,
            annotation: row.get(5)?,
            insignia: row.get(6)?,
        })
    }

    let stmt = "SELECT nd.note_id as note_id,
                       d.id as deck_id,
                       d.kind as kind,
                       d.name as deck_name,
                       nd2.kind as ref_kind,
                       nd2.annotation,
                       d.insignia
                FROM notes_decks nd, notes_decks nd2, decks d
                WHERE nd.deck_id = ?1
                      AND nd.note_id = nd2.note_id
                      AND d.id = nd2.deck_id
                ORDER BY nd2.deck_id";
    sqlite::many(&conn, stmt, params![&deck_id], backref_from_row)
}

// return all the ideas, people, articles etc mentioned in the given deck
// (used to show refs on left hand margin)
//
pub(crate) fn from_deck_id_via_notes_to_decks(
    sqlite_pool: &SqlitePool,
    deck_id: Key,
) -> Result<Vec<interop::Ref>> {
    let conn = sqlite_pool.get()?;

    fn ref_from_row(row: &Row) -> Result<interop::Ref> {
        let kind: String = row.get(3)?;
        let refk: String = row.get(4)?;

        Ok(interop::Ref {
            note_id: row.get(0)?,
            id: row.get(1)?,
            name: row.get(2)?,
            resource: DeckKind::from_str(&kind)?,
            ref_kind: interop::RefKind::from_str(&refk)?,
            annotation: row.get(5)?,
            insignia: row.get(6)?,
        })
    }

    let stmt = "SELECT n.id as note_id,
                       d.id,
                       d.name,
                       d.kind as deck_kind,
                       nd.kind as ref_kind,
                       nd.annotation,
                       d.insignia
                FROM   notes n,
                       notes_decks nd,
                       decks d
                WHERE  n.deck_id = ?1
                       AND nd.note_id = n.id
                       AND nd.deck_id = d.id
                ORDER BY nd.note_id, d.kind DESC, d.name";
    sqlite::many(&conn, stmt, params![&deck_id], ref_from_row)
}

fn deck_simple_from_search_result(row: &Row) -> Result<interop::DeckSimple> {
    let kind: String = row.get(1)?;

    Ok(interop::DeckSimple {
        id: row.get(0)?,
        name: row.get(2)?,
        resource: DeckKind::from_str(&kind)?,
        insignia: row.get(3)?,
    })
}

fn postfix_asterisks(s: &str) -> Result<String> {
    let mut res: String = "".to_string();

    for i in s.split_whitespace() {
        res.push_str(i);
        res.push_str("* ");
    }

    Ok(res)
}

pub(crate) fn search(
    sqlite_pool: &SqlitePool,
    user_id: Key,
    query: &str,
) -> Result<Vec<interop::DeckSimple>> {
    let conn = sqlite_pool.get()?;

    let q = postfix_asterisks(query)?;

    let stmt =
        "select d.id, d.kind, d.name, d.insignia, decks_fts.rank AS rank_sum, 1 as rank_count
                from decks_fts left join decks d on d.id = decks_fts.rowid
                where decks_fts match ?2
                      and d.user_id = ?1
                group by d.id
                order by rank_sum asc, length(d.name) asc
                limit 30";
    let mut results = sqlite::many(
        &conn,
        stmt,
        params![&user_id, &q],
        deck_simple_from_search_result,
    )?;

    let stmt = "select d.id, d.kind, d.name, d.insignia, article_extras_fts.rank AS rank_sum, 1 as rank_count
                from article_extras_fts left join decks d on d.id = article_extras_fts.rowid
                where article_extras_fts match ?2
                      and d.user_id = ?1
                group by d.id
                order by rank_sum asc, length(d.name) asc
                limit 30";
    let results_via_pub_ext = sqlite::many(
        &conn,
        stmt,
        params![&user_id, &q],
        deck_simple_from_search_result,
    )?;

    let stmt = "select d.id, d.kind, d.name, d.insignia, quote_extras_fts.rank AS rank_sum, 1 as rank_count
                from quote_extras_fts left join decks d on d.id = quote_extras_fts.rowid
                where quote_extras_fts match ?2
                      and d.user_id = ?1
                group by d.id
                order by rank_sum asc, length(d.name) asc
                limit 30";
    let results_via_quote_ext = sqlite::many(
        &conn,
        stmt,
        params![&user_id, &q],
        deck_simple_from_search_result,
    )?;

    let stmt = "select res.id, res.kind, res.name, res.insignia, sum(res.rank) as rank_sum, count(res.rank) as rank_count
                from (select d.id, d.kind, d.name, d.insignia, notes_fts.rank AS rank
                      from notes_fts
                           left join notes n on n.id = notes_fts.rowid
                           left join decks d on d.id = n.deck_id
                      where notes_fts match ?2
                            and d.user_id = ?1
                      group by d.id
                      order by rank asc) res
                group by res.id, res.kind, res.name
                order by sum(res.rank) asc, length(res.name) asc
                limit 30";
    let results_via_notes = sqlite::many(
        &conn,
        stmt,
        params![&user_id, &q],
        deck_simple_from_search_result,
    )?;

    let stmt = "select res.id, res.kind, res.name, res.insignia, sum(res.rank) as rank_sum, count(res.rank) as rank_count
                from (select d.id, d.kind, d.name, d.insignia, points_fts.rank AS rank
                      from points_fts
                           left join points n on n.id = points_fts.rowid
                           left join decks d on d.id = n.deck_id
                      where points_fts match ?2
                            and d.user_id = ?1
                      group by d.id
                      order by rank asc) res
                group by res.id, res.kind, res.name
                order by sum(res.rank) asc, length(res.name) asc
                limit 30";
    let results_via_points = sqlite::many(
        &conn,
        stmt,
        params![&user_id, &q],
        deck_simple_from_search_result,
    )?;

    for r in results_via_pub_ext {
        if !contains(&results, r.id) {
            results.push(r);
        }
    }

    for r in results_via_quote_ext {
        if !contains(&results, r.id) {
            results.push(r);
        }
    }

    for r in results_via_notes {
        if !contains(&results, r.id) {
            results.push(r);
        }
    }

    for r in results_via_points {
        if !contains(&results, r.id) {
            results.push(r);
        }
    }

    Ok(results)
}

pub(crate) fn search_by_name(
    sqlite_pool: &SqlitePool,
    user_id: Key,
    query: &str,
) -> Result<Vec<interop::DeckSimple>> {
    let conn = sqlite_pool.get()?;

    let stmt =
        "select d.id, d.kind, d.name, d.insignia, decks_fts.rank AS rank_sum, 1 as rank_count
                from decks_fts left join decks d on d.id = decks_fts.rowid
                where decks_fts match ?2
                      and d.user_id = ?1
                group by d.id
                order by rank_sum asc, length(d.name) asc
                limit 20";
    let mut results = sqlite::many(
        &conn,
        stmt,
        params![&user_id, &query],
        deck_simple_from_search_result,
    )?;

    let stmt = "select id, kind, name, insignia, 0 as rank_sum, 1 as rank_count
                from decks
                where name like '%' || ?2 || '%'
                and user_id = ?1
                limit 20";
    let res2 = sqlite::many(
        &conn,
        stmt,
        params![&user_id, &query],
        deck_simple_from_search_result,
    )?;

    for r in res2 {
        if !contains(&results, r.id) {
            results.push(r);
        }
    }

    Ok(results)
}

pub(crate) fn additional_search(
    sqlite_pool: &SqlitePool,
    user_id: Key,
    deck_id: Key,
) -> Result<Vec<interop::DeckSimple>> {
    info!("additional_search {:?}", deck_id);

    fn has(backref: &interop::DeckSimple, backnotes: &[interop::BackNote]) -> bool {
        backnotes.iter().any(|br| br.deck_id == backref.id)
    }

    let backnotes = get_backnotes(sqlite_pool, deck_id)?;
    let search_results = search_using_deck_id(sqlite_pool, user_id, deck_id)?;

    // dedupe search results against the backrefs to decks
    let additional_search_results: Vec<interop::DeckSimple> = search_results
        .into_iter()
        .filter(|br| br.id != deck_id && !has(br, &backnotes))
        .collect();

    Ok(additional_search_results)
}

fn get_name_of_deck(conn: &Connection, deck_id: Key) -> Result<String> {
    fn string_from_row(row: &Row) -> Result<String> {
        let s: String = row.get(0)?;
        Ok(s)
    }

    let name: String = sqlite::one(
        conn,
        "select name from decks where id = ?1",
        params![&deck_id],
        string_from_row,
    )?;

    Ok(name)
}

fn sanitize_for_sqlite_match(s: String) -> Result<String> {
    let res: String = s
        .chars()
        .map(|x| match x {
            '?' => ' ',
            '>' => ' ',
            '<' => ' ',
            '+' => ' ',
            '-' => ' ',
            '\\' => ' ',
            '*' => ' ',
            '%' => ' ',
            '!' => ' ',
            '(' => ' ',
            ')' => ' ',
            ',' => ' ',
            '.' => ' ',
            ':' => ' ',
            '\'' => ' ',
            _ => x,
        })
        .collect();

    Ok(res)
}

pub(crate) fn search_using_deck_id(
    sqlite_pool: &SqlitePool,
    user_id: Key,
    deck_id: Key,
) -> Result<Vec<interop::DeckSimple>> {
    let conn = sqlite_pool.get()?;

    let name = get_name_of_deck(&conn, deck_id)?;
    let sane_name = sanitize_for_sqlite_match(name)?;

    let stmt =
        "select d.id, d.kind, d.name, d.insignia, decks_fts.rank AS rank_sum, 1 as rank_count
                from decks_fts left join decks d on d.id = decks_fts.rowid
                where decks_fts match ?2
                      and d.user_id = ?1
                group by d.id
                order by rank_sum asc, length(d.name) asc
                limit 50";
    let mut results = sqlite::many(
        &conn,
        stmt,
        params![&user_id, &sane_name],
        deck_simple_from_search_result,
    )?;

    let stmt = "select d.id, d.kind, d.name, d.insignia, article_extras_fts.rank AS rank_sum, 1 as rank_count
                from article_extras_fts left join decks d on d.id = article_extras_fts.rowid
                where article_extras_fts match ?2
                      and d.user_id = ?1
                group by d.id
                order by rank_sum asc, length(d.name) asc
                limit 50";
    let results_via_pub_ext = sqlite::many(
        &conn,
        stmt,
        params![&user_id, &sane_name],
        deck_simple_from_search_result,
    )?;

    let stmt = "select d.id, d.kind, d.name, d.insignia, quote_extras_fts.rank AS rank_sum, 1 as rank_count
                from quote_extras_fts left join decks d on d.id = quote_extras_fts.rowid
                where quote_extras_fts match ?2
                      and d.user_id = ?1
                group by d.id
                order by rank_sum asc, length(d.name) asc
                limit 50";
    let results_via_quote_ext = sqlite::many(
        &conn,
        stmt,
        params![&user_id, &sane_name],
        deck_simple_from_search_result,
    )?;

    let stmt = "select res.id, res.kind, res.name, res.insignia, sum(res.rank) as rank_sum, count(res.rank) as rank_count
                from (select d.id, d.kind, d.name, d.insignia, notes_fts.rank AS rank
                      from notes_fts
                           left join notes n on n.id = notes_fts.rowid
                           left join decks d on d.id = n.deck_id
                      where notes_fts match ?2
                            and d.user_id = ?1
                      group by d.id
                      order by rank asc) res
                group by res.id, res.kind, res.name
                order by sum(res.rank) asc, length(res.name) asc
                limit 50";
    let results_via_notes = sqlite::many(
        &conn,
        stmt,
        params![&user_id, &sane_name],
        deck_simple_from_search_result,
    )?;

    let stmt = "select res.id, res.kind, res.name, res.insignia, sum(res.rank) as rank_sum, count(res.rank) as rank_count
                from (select d.id, d.kind, d.name, d.insignia, points_fts.rank AS rank
                      from points_fts
                           left join points n on n.id = points_fts.rowid
                           left join decks d on d.id = n.deck_id
                      where points_fts match ?2
                            and d.user_id = ?1
                      group by d.id
                      order by rank asc) res
                group by res.id, res.kind, res.name
                order by sum(res.rank) asc, length(res.name) asc
                limit 30";
    let results_via_points = sqlite::many(
        &conn,
        stmt,
        params![&user_id, &sane_name],
        deck_simple_from_search_result,
    )?;

    for r in results_via_pub_ext {
        if !contains(&results, r.id) {
            results.push(r);
        }
    }

    for r in results_via_quote_ext {
        if !contains(&results, r.id) {
            results.push(r);
        }
    }

    for r in results_via_notes {
        if !contains(&results, r.id) {
            results.push(r);
        }
    }

    for r in results_via_points {
        if !contains(&results, r.id) {
            results.push(r);
        }
    }

    Ok(results)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_postfix_asterisks() {
        assert_eq!(postfix_asterisks("hello foo").unwrap(), "hello* foo* ");
    }
}
