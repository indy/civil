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
use crate::interop::decks::{deck_kind_from_sqlite_string, sqlite_string_from_deck_kind, DeckKind};
use crate::interop::Key;
use rusqlite::{params, Connection, Row};

#[allow(unused_imports)]
use tracing::{info, warn};

pub(crate) enum DeckBaseOrigin {
    Created,
    PreExisting,
}

#[derive(Debug, Clone)]
pub struct DeckSimple {
    pub id: Key,
    pub name: String,
    pub kind: DeckKind,
}

impl From<DeckSimple> for interop::DeckSimple {
    fn from(d: DeckSimple) -> interop::DeckSimple {
        interop::DeckSimple {
            id: d.id,
            name: d.name,
            resource: interop::DeckKind::from(d.kind),
        }
    }
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
}

fn deckbase_from_row(row: &Row) -> Result<DeckBase> {
    Ok(DeckBase {
        id: row.get(0)?,
        name: row.get(1)?,
        created_at: row.get(2)?,
        graph_terminator: row.get(3)?,
    })
}

fn decksimple_from_row(row: &Row) -> Result<interop::DeckSimple> {
    let res: String = row.get(2)?;

    Ok(interop::DeckSimple {
        id: row.get(0)?,
        name: row.get(1)?,
        resource: interop::deck_kind_from_sqlite_string(res.as_str())?,
    })
}

pub(crate) const DECKBASE_QUERY: &str = "select id, name, created_at, graph_terminator
                                         from decks
                                         where user_id = ?1 and id = ?2 and kind = ?3";

// tuple where the second element is a bool indicating whether the deck was created (true) or
// we're returning a pre-existing deck (false)
//
pub(crate) fn deckbase_get_or_create(
    conn: &Connection,
    user_id: Key,
    kind: DeckKind,
    name: &str,
) -> Result<(DeckBase, DeckBaseOrigin)> {
    let existing_deck_res = deckbase_get_by_name(&conn, user_id, kind, &name);
    match existing_deck_res {
        Ok(deck) => Ok((deck.into(), DeckBaseOrigin::PreExisting)),
        Err(e) => match e {
            Error::NotFound => {
                let deck = deckbase_create(&conn, user_id, kind, &name)?;
                Ok((deck.into(), DeckBaseOrigin::Created))
            }
            _ => Err(e),
        },
    }
}

fn deckbase_get_by_name(
    conn: &Connection,
    user_id: Key,
    kind: DeckKind,
    name: &str,
) -> Result<DeckBase> {
    sqlite::one(
        &conn,
        r#"
                select id, name, created_at, graph_terminator
                from decks
                where user_id = ?1 and name = ?2 and kind = ?3"#,
        params![&user_id, &name, &sqlite_string_from_deck_kind(kind)],
        deckbase_from_row,
    )
}

pub(crate) fn deckbase_create(
    conn: &Connection,
    user_id: Key,
    kind: DeckKind,
    name: &str,
) -> Result<DeckBase> {
    let graph_terminator = false;
    sqlite::one(
        &conn,
        r#"
                INSERT INTO decks(user_id, kind, name, graph_terminator)
                VALUES (?1, ?2, ?3, ?4)
                RETURNING id, name, created_at, graph_terminator"#,
        params![
            &user_id,
            &sqlite_string_from_deck_kind(kind),
            name,
            graph_terminator
        ],
        deckbase_from_row,
    )
}

pub(crate) fn deckbase_edit(
    conn: &Connection,
    user_id: Key,
    deck_id: Key,
    kind: DeckKind,
    name: &str,
    graph_terminator: bool,
) -> Result<DeckBase> {
    sqlite::one(
        &conn,
        r#"
         UPDATE decks
         SET name = ?4, graph_terminator = ?5
         WHERE user_id = ?1 and id = ?2 and kind = ?3
         RETURNING id, name, created_at, graph_terminator"#,
        params![
            &user_id,
            &deck_id,
            &sqlite_string_from_deck_kind(kind),
            name,
            graph_terminator
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

    let stmt = "SELECT id, name, kind
                FROM decks
                WHERE user_id = ?1 AND kind = '$deck_kind'
                ORDER BY created_at DESC
                LIMIT $limit";
    let stmt = stmt.replace("$deck_kind", &deck_kind.to_string());
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
        let deck_kind = deck_kind_from_sqlite_string(kind.as_str())?;

        Ok(interop::BackNote {
            note_id: row.get(4)?,
            note_content: row.get(3)?,
            deck_id: row.get(0)?,
            deck_name: row.get(1)?,
            resource: interop::DeckKind::from(deck_kind),
        })
    }

    sqlite::many(
        &conn,
        "
         SELECT d.id AS deck_id,
                d.name AS deck_name,
                d.kind as kind,
                n.content as note_content,
                n.id as note_id
         FROM decks d,
              notes n,
              notes_decks nd
         WHERE n.deck_id = d.id
               AND nd.note_id = n.id
               AND nd.deck_id = ?1
         ORDER BY d.name, n.id",
        params![&deck_id],
        backnote_from_row,
    )
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
        let deck_kind = deck_kind_from_sqlite_string(kind.as_str())?;

        let refk: String = row.get(4)?;
        let ref_kind = interop::ref_kind_from_sqlite_string(refk.as_str())?;

        Ok(interop::BackRef {
            note_id: row.get(0)?,
            deck_id: row.get(1)?,
            deck_name: row.get(3)?,
            resource: interop::DeckKind::from(deck_kind), // todo: simplify all this
            ref_kind: interop::RefKind::from(ref_kind),   // todo: simplify all this
            annotation: row.get(5)?,
        })
    }

    sqlite::many(
        &conn,
        "SELECT nd.note_id as note_id,
                         d.id as deck_id,
                         d.kind as kind,
                         d.name as deck_name,
                         nd2.kind as ref_kind,
                         nd2.annotation
                  FROM notes_decks nd, notes_decks nd2, decks d
                  WHERE nd.deck_id = ?1
                        AND nd.note_id = nd2.note_id
                        AND d.id = nd2.deck_id
                  ORDER BY nd2.deck_id",
        params![&deck_id],
        backref_from_row,
    )
}

// return all the people, events, articles etc mentioned in the given deck
// (used to show refs on left hand margin)
//
pub(crate) fn from_deck_id_via_notes_to_decks(
    sqlite_pool: &SqlitePool,
    deck_id: Key,
) -> Result<Vec<interop::Ref>> {
    let conn = sqlite_pool.get()?;

    fn ref_from_row(row: &Row) -> Result<interop::Ref> {
        let kind: String = row.get(3)?;
        let deck_kind = deck_kind_from_sqlite_string(kind.as_str())?;

        let refk: String = row.get(4)?;
        let ref_kind = interop::ref_kind_from_sqlite_string(refk.as_str())?;

        Ok(interop::Ref {
            note_id: row.get(0)?,
            id: row.get(1)?,
            name: row.get(2)?,
            resource: interop::DeckKind::from(deck_kind), // todo: simplify all this
            ref_kind: interop::RefKind::from(ref_kind),   // todo: simplify all this
            annotation: row.get(5)?,
        })
    }

    sqlite::many(
        &conn,
        "SELECT n.id as note_id,
                d.id,
                d.name,
                d.kind as deck_kind,
                nd.kind as ref_kind,
                nd.annotation
         FROM   notes n,
                notes_decks nd,
                decks d
         WHERE  n.deck_id = ?1
                AND nd.note_id = n.id
                AND nd.deck_id = d.id
         ORDER BY nd.note_id, d.kind DESC, d.name",
        params![&deck_id],
        ref_from_row,
    )
}

fn deck_simple_from_search_result(row: &Row) -> Result<interop::DeckSimple> {
    let kind: String = row.get(1)?;
    let deck_kind = deck_kind_from_sqlite_string(kind.as_str())?;
    Ok(interop::DeckSimple {
        id: row.get(0)?,
        name: row.get(2)?,
        resource: interop::DeckKind::from(deck_kind),
    })
}

pub(crate) fn search(
    sqlite_pool: &SqlitePool,
    user_id: Key,
    query: &str,
) -> Result<Vec<interop::DeckSimple>> {
    let conn = sqlite_pool.get()?;

    let mut results = sqlite::many(
        &conn,
        "select d.id, d.kind, d.name, decks_fts.rank AS rank_sum, 1 as rank_count
                                from decks_fts left join decks d on d.id = decks_fts.rowid
                                where decks_fts match ?2
                                      and d.user_id = ?1
                                group by d.id
                                order by rank_sum asc, length(d.name) asc
                                limit 30",
        params![&user_id, &query],
        deck_simple_from_search_result,
    )?;

    let results_via_pub_ext = sqlite::many(&conn,
                                           "select d.id, d.kind, d.name, article_extras_fts.rank AS rank_sum, 1 as rank_count
                                            from article_extras_fts left join decks d on d.id = article_extras_fts.rowid
                                            where article_extras_fts match ?2
                                                  and d.user_id = ?1
                                            group by d.id
                                            order by rank_sum asc, length(d.name) asc
                                            limit 30",
                                           params![&user_id, &query],
                                           deck_simple_from_search_result)?;

    let results_via_quote_ext = sqlite::many(&conn,
                                             "select d.id, d.kind, d.name, quote_extras_fts.rank AS rank_sum, 1 as rank_count
                                              from quote_extras_fts left join decks d on d.id = quote_extras_fts.rowid
                                              where quote_extras_fts match ?2
                                                    and d.user_id = ?1
                                              group by d.id
                                              order by rank_sum asc, length(d.name) asc
                                              limit 30",
                                             params![&user_id, &query],
                                             deck_simple_from_search_result)?;

    let results_via_notes = sqlite::many(&conn,
                                             "select res.id, res.kind, res.name, sum(res.rank) as rank_sum, count(res.rank) as rank_count
                                              from (select d.id, d.kind, d.name, notes_fts.rank AS rank
                                                    from notes_fts
                                                         left join notes n on n.id = notes_fts.rowid
                                                         left join decks d on d.id = n.deck_id
                                                    where notes_fts match ?2
                                                          and d.user_id = ?1
                                                    group by d.id
                                                    order by rank asc) res
                                              group by res.id, res.kind, res.name
                                              order by sum(res.rank) asc, length(res.name) asc
                                              limit 30",
                                             params![&user_id, &query],
                                             deck_simple_from_search_result)?;

    let results_via_points = sqlite::many(&conn,
                                             "select res.id, res.kind, res.name, sum(res.rank) as rank_sum, count(res.rank) as rank_count
                                              from (select d.id, d.kind, d.name, points_fts.rank AS rank
                                                    from points_fts
                                                         left join points n on n.id = points_fts.rowid
                                                         left join decks d on d.id = n.deck_id
                                                    where points_fts match ?2
                                                          and d.user_id = ?1
                                                    group by d.id
                                                    order by rank asc) res
                                              group by res.id, res.kind, res.name
                                              order by sum(res.rank) asc, length(res.name) asc
                                              limit 30",
                                             params![&user_id, &query],
                                             deck_simple_from_search_result)?;

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

    let mut results = sqlite::many(
        &conn,
        "select d.id, d.kind, d.name, decks_fts.rank AS rank_sum, 1 as rank_count
                                    from decks_fts left join decks d on d.id = decks_fts.rowid
                                    where decks_fts match ?2
                                          and d.user_id = ?1
                                    group by d.id
                                    order by rank_sum asc, length(d.name) asc
                                    limit 20",
        params![&user_id, &query],
        deck_simple_from_search_result,
    )?;

    let res2 = sqlite::many(
        &conn,
        "select id, kind, name, 0 as rank_sum, 1 as rank_count
                                    from decks
                                    where name like '%' || ?2 || '%'
                                    and user_id = ?1
                                    limit 20",
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

    let backnotes = get_backnotes(&sqlite_pool, deck_id)?;
    let search_results = search_using_deck_id(&sqlite_pool, user_id, deck_id)?;

    // dedupe search results against the backrefs to decks
    let additional_search_results: Vec<interop::DeckSimple> = search_results
        .into_iter()
        .filter(|br| br.id != deck_id && !has(br, &backnotes))
        .collect();

    Ok(additional_search_results)
}

pub(crate) fn search_using_deck_id(
    sqlite_pool: &SqlitePool,
    user_id: Key,
    deck_id: Key,
) -> Result<Vec<interop::DeckSimple>> {
    let conn = sqlite_pool.get()?;

    let mut results = sqlite::many(&conn,
                               "select d.id, d.kind, d.name, decks_fts.rank AS rank_sum, 1 as rank_count
                                from decks deckname, decks_fts left join decks d on d.id = decks_fts.rowid
                                where deckname.id = ?2
                                      and decks_fts match deckname.name
                                      and d.user_id = ?1
                                group by d.id, deckname.name
                                order by rank_sum asc, length(d.name) asc
                                limit 50",
                               params![&user_id, &deck_id],
                               deck_simple_from_search_result)?;

    let results_via_pub_ext = sqlite::many(&conn,
                                           "select d.id, d.kind, d.name, article_extras_fts.rank AS rank_sum, 1 as rank_count
                                            from decks deckname, article_extras_fts left join decks d on d.id = article_extras_fts.rowid
                                            where deckname.id = ?2
                                                  and article_extras_fts match deckname.name
                                                  and d.user_id = ?1
                                            group by d.id, deckname.name
                                            order by rank_sum asc, length(d.name) asc
                                            limit 50",
                                           params![&user_id, &deck_id],
                                           deck_simple_from_search_result)?;

    let results_via_quote_ext = sqlite::many(&conn,
                                             "select d.id, d.kind, d.name, quote_extras_fts.rank AS rank_sum, 1 as rank_count
                                              from decks deckname, quote_extras_fts left join decks d on d.id = quote_extras_fts.rowid
                                              where deckname.id = ?2
                                                    and quote_extras_fts match deckname.name
                                                    and d.user_id = ?1
                                              group by d.id, deckname.name
                                              order by rank_sum asc, length(d.name) asc
                                              limit 50",
                                             params![&user_id, &deck_id],
                                             deck_simple_from_search_result)?;

    let results_via_notes = sqlite::many(&conn,
                                             "select res.id, res.kind, res.name, sum(res.rank) as rank_sum, count(res.rank) as rank_count
                                              from (select d.id, d.kind, d.name, notes_fts.rank AS rank
                                                    from decks deckname, notes_fts
                                                         left join notes n on n.id = notes_fts.rowid
                                                         left join decks d on d.id = n.deck_id
                                                    where deckname.id = ?2
                                                          and notes_fts match deckname.name
                                                          and d.user_id = ?1
                                                    group by d.id, deckname.name
                                                    order by rank asc) res
                                              group by res.id, res.kind, res.name
                                              order by sum(res.rank) asc, length(res.name) asc
                                              limit 50",
                                             params![&user_id, &deck_id],
                                             deck_simple_from_search_result)?;

    let results_via_points = sqlite::many(&conn,
                                             "select res.id, res.kind, res.name, sum(res.rank) as rank_sum, count(res.rank) as rank_count
                                              from (select d.id, d.kind, d.name, points_fts.rank AS rank
                                                    from decks deckname, points_fts
                                                         left join points n on n.id = points_fts.rowid
                                                         left join decks d on d.id = n.deck_id
                                                    where deckname.id = ?2
                                                          and points_fts match deckname.name
                                                          and d.user_id = ?1
                                                    group by d.id, deckname.name
                                                    order by rank asc) res
                                              group by res.id, res.kind, res.name
                                              order by sum(res.rank) asc, length(res.name) asc
                                              limit 30",
                                             params![&user_id, &deck_id],
                                             deck_simple_from_search_result)?;

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
