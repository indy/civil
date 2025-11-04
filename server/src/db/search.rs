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

use crate::db::memorise as db_memorise;
use crate::db::notes as db_notes;
use crate::db::sanitize_for_sqlite_match;
use crate::db::{SqlitePool, DbError};
use crate::db::sqlite::{self, FromRow};
use crate::interop::decks::{Arrival, DeckKind, Ref, SlimDeck};
use crate::interop::notes::Note;
use crate::interop::search::{SearchDeck, SearchResults};
use crate::interop::Key;
use rusqlite::{params, Connection, Row};

#[allow(unused_imports)]
use tracing::{info, warn};

impl FromRow for SearchDeck {
    fn from_row(row: &Row) -> crate::Result<SearchDeck> {
        Ok(SearchDeck {
            rank: row.get(8)?,
            deck: SlimDeck {
                id: row.get(0)?,
                title: row.get(1)?,
                deck_kind: row.get(2)?,
                created_at: row.get(3)?,
                graph_terminator: row.get(4)?,
                insignia: row.get(5)?,
                font: row.get(6)?,
                impact: row.get(7)?,
            },
            notes: vec![],
        })
    }

    fn from_row_conn(row: &Row) -> Result<SearchDeck, DbError> {
        Ok(SearchDeck {
            rank: row.get(8)?,
            deck: SlimDeck {
                id: row.get(0)?,
                title: row.get(1)?,
                deck_kind: row.get(2)?,
                created_at: row.get(3)?,
                graph_terminator: row.get(4)?,
                insignia: row.get(5)?,
                font: row.get(6)?,
                impact: row.get(7)?,
            },
            notes: vec![],
        })
    }
}

#[derive(Debug)]
struct SearchDeckNoteRef {
    pub rank: f32,
    pub deck: SlimDeck,
    pub note: Note,
    pub reference_maybe: Option<Ref>,
}

fn contains(searchdecks: &[SearchDeck], id: Key) -> bool {
    searchdecks.iter().any(|br| br.deck.id == id)
}

impl FromRow for SearchDeckNoteRef {
    fn from_row(row: &Row) -> crate::Result<SearchDeckNoteRef> {
        let mut reference_maybe: Option<Ref> = None;
        let reference_deck_id: Option<Key> = row.get(15)?;
        if let Some(ref_deck_id) = reference_deck_id {
            reference_maybe = Some(Ref {
                note_id: row.get(9)?,
                ref_kind: row.get(16)?,
                annotation: row.get(17)?,

                id: ref_deck_id,
                title: row.get(18)?,
                deck_kind: row.get(19)?,
                created_at: row.get(20)?,
                graph_terminator: row.get(21)?,
                insignia: row.get(22)?,
                font: row.get(23)?,
                impact: row.get(24)?,
            })
        };

        Ok(SearchDeckNoteRef {
            rank: row.get(0)?,
            deck: SlimDeck {
                id: row.get(1)?,
                title: row.get(2)?,
                deck_kind: row.get(3)?,
                created_at: row.get(4)?,
                graph_terminator: row.get(5)?,
                insignia: row.get(6)?,
                font: row.get(7)?,
                impact: row.get(8)?,
            },
            note: Note {
                id: row.get(9)?,
                prev_note_id: row.get(10)?,
                kind: row.get(11)?,
                content: row.get(12)?,
                point_id: row.get(13)?,
                font: row.get(14)?,
                refs: vec![],
                flashcards: vec![],
            },
            reference_maybe,
        })
    }


    fn from_row_conn(row: &Row) -> Result<SearchDeckNoteRef, DbError> {
        let mut reference_maybe: Option<Ref> = None;
        let reference_deck_id: Option<Key> = row.get(15)?;
        if let Some(ref_deck_id) = reference_deck_id {
            reference_maybe = Some(Ref {
                note_id: row.get(9)?,
                ref_kind: row.get(16)?,
                annotation: row.get(17)?,

                id: ref_deck_id,
                title: row.get(18)?,
                deck_kind: row.get(19)?,
                created_at: row.get(20)?,
                graph_terminator: row.get(21)?,
                insignia: row.get(22)?,
                font: row.get(23)?,
                impact: row.get(24)?,
            })
        };

        Ok(SearchDeckNoteRef {
            rank: row.get(0)?,
            deck: SlimDeck {
                id: row.get(1)?,
                title: row.get(2)?,
                deck_kind: row.get(3)?,
                created_at: row.get(4)?,
                graph_terminator: row.get(5)?,
                insignia: row.get(6)?,
                font: row.get(7)?,
                impact: row.get(8)?,
            },
            note: Note {
                id: row.get(9)?,
                prev_note_id: row.get(10)?,
                kind: row.get(11)?,
                content: row.get(12)?,
                point_id: row.get(13)?,
                font: row.get(14)?,
                refs: vec![],
                flashcards: vec![],
            },
            reference_maybe,
        })
    }
}

pub(crate) fn search_at_all_levels(
    sqlite_pool: &SqlitePool,
    user_id: Key,
    query: &str,
) -> crate::Result<SearchResults> {
    let deck_level_results = search_at_deck_level(sqlite_pool, user_id, query)?;
    let note_level_results = search_at_note_level(sqlite_pool, user_id, query)?;

    // dedupe deck_level against note_level
    //
    let deduped_deck_level_results: Vec<SearchDeck> = deck_level_results
        .into_iter()
        .filter(|search_deck| !in_searchdecks(search_deck, &note_level_results))
        .collect();

    let res = SearchResults {
        search_text: String::from(query),
        deck_level: deduped_deck_level_results,
        note_level: note_level_results,
    };

    Ok(res)
}

pub(crate) fn search_quotes(
    sqlite_pool: &SqlitePool,
    user_id: Key,
    query: &str,
) -> crate::Result<SearchResults> {
    let note_level_results = search_quotes_at_note_level(sqlite_pool, user_id, query)?;

    let res = SearchResults {
        search_text: String::from(query),
        deck_level: vec![],
        note_level: note_level_results,
    };

    Ok(res)
}

fn search_quotes_at_note_level(
    sqlite_pool: &SqlitePool,
    user_id: Key,
    query: &str,
) -> crate::Result<Vec<SearchDeck>> {
    // be lazy, re-use the search_query fn and then filter for quotes
    //
    let search_deck_note_refs = search_query(sqlite_pool, user_id, query)?;

    let mut search_decks = build_search_decks(search_deck_note_refs)?;

    let flashcards = db_memorise::all_flashcards_for_search_query(sqlite_pool, user_id, query)?;

    for search_deck in &mut *search_decks {
        db_notes::assign_flashcards_to_notes(&mut search_deck.notes, &flashcards)?;
    }

    let search_quotes: Vec<SearchDeck> = search_decks
        .into_iter()
        .filter(|search_deck| search_deck.deck.deck_kind == DeckKind::Quote)
        .collect();

    Ok(search_quotes)
}

pub(crate) fn search_at_deck_level(
    sqlite_pool: &SqlitePool,
    user_id: Key,
    query: &str,
) -> crate::Result<Vec<SearchDeck>> {
    search_at_deck_level_base(sqlite_pool, user_id, &query, false)
}

pub(crate) fn search_names_at_deck_level(
    sqlite_pool: &SqlitePool,
    user_id: Key,
    query: &str,
) -> crate::Result<Vec<SearchDeck>> {
    let conn = sqlite_pool.get()?;

    let stmt = "select d.id, d.name, d.kind, d.created_at, d.graph_terminator, d.insignia, d.font, d.impact,
                       decks_fts.rank AS rank_sum, 1 as rank_count
                from decks_fts left join decks d on d.id = decks_fts.rowid
                where decks_fts match ?2
                      and d.user_id = ?1
                group by d.id
                order by rank_sum asc, length(d.name) asc
                limit 20";
    let mut results: Vec<SearchDeck> = sqlite::many(&conn, stmt, params![&user_id, &query])?;

    let stmt =
        "select id, name, kind, created_at, graph_terminator, insignia, font, impact, 0 as rank_sum, 1 as rank_count
                from decks
                where name like '%' || ?2 || '%'
                and user_id = ?1
                limit 20";
    let res2: Vec<SearchDeck> = sqlite::many(&conn, stmt, params![&user_id, &query])?;

    for r in res2 {
        if !contains(&results, r.deck.id) {
            results.push(r);
        }
    }

    Ok(results)
}

pub(crate) fn additional_search_at_deck_level(
    sqlite_pool: &SqlitePool,
    user_id: Key,
    deck_id: Key,
) -> crate::Result<SearchResults> {
    info!("additional_search {:?}", deck_id);

    let conn = sqlite_pool.get()?;
    let name = get_name_of_deck(&conn, deck_id)?;
    let sane_name = sanitize_for_sqlite_match(name.clone())?;

    if sane_name.is_empty() {
        return Ok(SearchResults {
            search_text: name,
            deck_level: vec![],
            note_level: vec![],
        });
    }

    // explicitly connected decks should be excluded from search results
    //
    let arrivals = db_notes::arrivals_for_deck(sqlite_pool, deck_id)?;

    let deck_level_results = search_at_deck_level_base(sqlite_pool, user_id, &sane_name, true)?;

    // dedupe deck_level_results against the arrivals
    let deck_level_results: Vec<SearchDeck> = deck_level_results
        .into_iter()
        .filter(|br| br.deck.id != deck_id && !in_arrivals(br, &arrivals))
        .collect();

    let note_level_results = additional_search_at_note_level(sqlite_pool, user_id, deck_id)?;

    // dedupe note_level_results against the arrivals
    let note_level_results: Vec<SearchDeck> = note_level_results
        .into_iter()
        .filter(|br| br.deck.id != deck_id && !in_arrivals(br, &arrivals))
        .collect();

    // deck_level_results take priority as they will probably be more relevant.
    // so dedupe the search_results from the seek_results
    //
    let deduped_deck_level_results: Vec<SearchDeck> = deck_level_results
        .into_iter()
        .filter(|search_deck| !in_searchdecks(search_deck, &note_level_results))
        .collect();

    let res = SearchResults {
        search_text: name,
        deck_level: deduped_deck_level_results,
        note_level: note_level_results,
    };

    Ok(res)
}

fn in_searchdecks(search_deck: &SearchDeck, search_decks: &[SearchDeck]) -> bool {
    search_decks
        .iter()
        .any(|s| s.deck.id == search_deck.deck.id)
}

fn in_arrivals(searchdeck: &SearchDeck, arrivals: &[Arrival]) -> bool {
    arrivals.iter().any(|br| br.deck.id == searchdeck.deck.id)
}

fn get_name_of_deck(conn: &Connection, deck_id: Key) -> crate::Result<String> {
    sqlite::one(
        conn,
        "select name from decks where id = ?1",
        params![&deck_id],
    )
}

fn additional_search_at_note_level(
    sqlite_pool: &SqlitePool,
    user_id: Key,
    deck_id: Key,
) -> crate::Result<Vec<SearchDeck>> {
    let conn = sqlite_pool.get()?;
    let name = get_name_of_deck(&conn, deck_id)?;
    let sane_name = sanitize_for_sqlite_match(name)?;

    let search_deck_note_refs =
        search_deck_additional_query(sqlite_pool, user_id, deck_id, &sane_name)?;
    let mut search_decks = build_search_decks(search_deck_note_refs)?;

    let flashcards = db_memorise::all_flashcards_for_deck_additional_query(
        sqlite_pool,
        user_id,
        deck_id,
        &sane_name,
    )?;

    for search_deck in &mut *search_decks {
        db_notes::assign_flashcards_to_notes(&mut search_deck.notes, &flashcards)?;
    }

    // given a search for 'dogs'
    // if there was a deck (dx) that had a note (nx) that had references to 'dogs' and 'cats'
    // then the query would still return a row corressponding to deck dx, note nx and ref 'cats'
    //
    // so the query has been changed to return all references including 'dogs'
    // then we can use some rust to filter out any notes that contain refs to 'dogs'
    //
    let search_decks_b: Vec<SearchDeck> = search_decks
        .into_iter()
        .map(|search_deck| remove_notes_with_refs_to_deck_id(search_deck, deck_id))
        .collect();

    // now that some of the notes have been removed, there may be some decks that have no notes.
    // remove those decks as well
    //
    let search_decks_c: Vec<SearchDeck> = search_decks_b
        .into_iter()
        .filter(|search_deck| !search_deck.notes.is_empty())
        .collect();

    Ok(search_decks_c)
}

fn build_search_decks(
    search_deck_note_refs: Vec<SearchDeckNoteRef>,
) -> crate::Result<Vec<SearchDeck>> {
    let mut res: Vec<SearchDeck> = vec![];

    for sdnr in search_deck_note_refs {
        let mut found: bool = false;
        let mut deck_index: usize = 0;
        for r in &res {
            if r.deck.id == sdnr.deck.id {
                found = true;
                break;
            }
            deck_index += 1;
        }
        if !found {
            res.push(SearchDeck {
                rank: sdnr.rank,
                deck: sdnr.deck,
                notes: vec![],
            });
        }

        found = false;
        let mut note_index: usize = 0;
        for n in &res[deck_index].notes {
            if n.id == sdnr.note.id {
                found = true;
                break;
            }
            note_index += 1;
        }
        if !found {
            res[deck_index].notes.push(sdnr.note)
        }

        if let Some(rrr) = sdnr.reference_maybe {
            res[deck_index].notes[note_index].refs.push(rrr);
        }
    }

    Ok(res)
}

pub(crate) fn search_at_note_level(
    sqlite_pool: &SqlitePool,
    user_id: Key,
    query: &str,
) -> crate::Result<Vec<SearchDeck>> {
    let search_deck_note_refs = search_query(sqlite_pool, user_id, query)?;
    let mut search_decks = build_search_decks(search_deck_note_refs)?;

    let flashcards = db_memorise::all_flashcards_for_search_query(sqlite_pool, user_id, query)?;

    for search_deck in &mut *search_decks {
        db_notes::assign_flashcards_to_notes(&mut search_deck.notes, &flashcards)?;
    }

    Ok(search_decks)
}

fn has_ref_to_deck_id(search_note: &Note, deck_id: Key) -> bool {
    search_note
        .refs
        .iter()
        .any(|reference| reference.id == deck_id)
}

fn remove_notes_with_refs_to_deck_id(search_deck: SearchDeck, deck_id: Key) -> SearchDeck {
    SearchDeck {
        rank: search_deck.rank,
        deck: search_deck.deck,
        notes: search_deck
            .notes
            .into_iter()
            .filter(|note| !has_ref_to_deck_id(note, deck_id))
            .collect(),
    }
}

fn search_query(
    sqlite_pool: &SqlitePool,
    user_id: Key,
    query: &str,
) -> crate::Result<Vec<SearchDeckNoteRef>> {
    let conn = sqlite_pool.get()?;

    let stmt = "SELECT notes_fts.rank AS rank,
                       d.id, d.name, d.kind, d.created_at, d.graph_terminator, d.insignia, d.font, d.impact,
                       n.id, n.prev_note_id, n.kind,
                       highlight(notes_fts, 0, ':searched(', ')') as content,
                       n.point_id, n.font,
                       r.deck_id, r.kind, r.annotation, d2.name, d2.kind, d2.created_at,
                       d2.graph_terminator, d2.insignia, d2.font, d2.impact
               FROM notes_fts
                    LEFT JOIN notes n ON n.id = notes_fts.rowid
                    LEFT JOIN decks d ON d.id = n.deck_id
                    LEFT JOIN dialogue_messages dm ON dm.note_id = n.id
                    LEFT JOIN refs r on r.note_id = n.id
                    LEFT JOIN decks d2 on d2.id = r.deck_id
               WHERE notes_fts match ?2
                     AND d.user_id = ?1
                     AND (dm.role IS null OR dm.role <> 'system')
               ORDER BY rank ASC
               LIMIT 100";
    sqlite::many(&conn, stmt, params![&user_id, &query])
}

// only searching via notes for the moment, will have to add additional search queries that look in points, article_extras etc
//
fn search_deck_additional_query(
    sqlite_pool: &SqlitePool,
    user_id: Key,
    deck_id: Key,
    sane_name: &str,
) -> crate::Result<Vec<SearchDeckNoteRef>> {
    let conn = sqlite_pool.get()?;

    // let name = get_name_of_deck(&conn, deck_id)?;
    // let sane_name = sanitize_for_sqlite_match(name)?;

    if sane_name.is_empty() {
        return Ok(vec![]);
    }

    let stmt = "SELECT notes_fts.rank AS rank,
                       d.id, d.name, d.kind, d.created_at, d.graph_terminator, d.insignia, d.font, d.impact,
                       n.id, n.prev_note_id, n.kind,
                       highlight(notes_fts, 0, ':searched(', ')') as content,
                       n.point_id, n.font,
                       r.deck_id, r.kind, r.annotation, d2.name, d2.kind,
                       d2.created_at, d2.graph_terminator, d2.insignia, d2.font, d2.impact
               FROM notes_fts
                    LEFT JOIN notes n ON n.id = notes_fts.rowid
                    LEFT JOIN decks d ON d.id = n.deck_id
                    LEFT JOIN dialogue_messages dm ON dm.note_id = n.id
                    LEFT JOIN refs r on r.note_id = n.id
                    LEFT JOIN decks d2 on d2.id = r.deck_id
               WHERE notes_fts match ?2
                     AND d.user_id = ?1
                     AND d.id <> ?3
                     AND (dm.role IS null OR dm.role <> 'system')
               ORDER BY rank ASC
               LIMIT 100";

    sqlite::many(&conn, stmt, params![&user_id, &sane_name, &deck_id])
}

fn search_at_deck_level_base(
    sqlite_pool: &SqlitePool,
    user_id: Key,
    query: &str,
    ignore_notes: bool,
) -> crate::Result<Vec<SearchDeck>> {
    let conn = sqlite_pool.get()?;

    let q = query;

    let stmt = "SELECT d.id, d.name, d.kind, d.created_at, d.graph_terminator, d.insignia, d.font, d.impact,
                decks_fts.rank AS rank_sum, 1 AS rank_count
         FROM decks_fts LEFT JOIN decks d ON d.id = decks_fts.rowid
         WHERE decks_fts MATCH ?2
               AND d.user_id = ?1
         GROUP BY d.id
         ORDER BY rank_sum ASC, length(d.name) ASC, d.created_at DESC
         LIMIT 30";
    let mut results: Vec<SearchDeck> = sqlite::many(&conn, stmt, params![&user_id, &q])?;

    let stmt = "select d.id, d.name, d.kind, d.created_at, d.graph_terminator, d.insignia, d.font, d.impact,
                       article_extras_fts.rank AS rank_sum, 1 as rank_count
                from article_extras_fts left join decks d on d.id = article_extras_fts.rowid
                where article_extras_fts match ?2
                      and d.user_id = ?1
                group by d.id
                order by rank_sum asc, length(d.name) asc
                limit 30";
    let results_via_pub_ext: Vec<SearchDeck> = sqlite::many(&conn, stmt, params![&user_id, &q])?;

    let stmt = "select res.id, res.name, res.kind, res.created_at, res.graph_terminator, res.insignia, res.font, res.impact,
                       sum(res.rank) as rank_sum, count(res.rank) as rank_count
                from (select d.id, d.name, d.kind, d.created_at, d.graph_terminator, d.insignia, d.font,
                             d.impact, points_fts.rank AS rank
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
    let results_via_points: Vec<SearchDeck> = sqlite::many(&conn, stmt, params![&user_id, &q])?;

    for r in results_via_pub_ext {
        if !contains(&results, r.deck.id) {
            results.push(r);
        }
    }

    if !ignore_notes {
        let stmt = "select res.id, res.name, res.kind, res.created_at, res.graph_terminator, res.insignia, res.font, res.impact,
                           sum(res.rank) as rank_sum, count(res.rank) as rank_count
                from (select d.id, d.name, d.kind, d.created_at, d.graph_terminator, d.insignia, d.font, d.impact, notes_fts.rank AS rank
                      from notes_fts
                           left join notes n on n.id = notes_fts.rowid
                           left join decks d on d.id = n.deck_id
                           left join dialogue_messages dm on dm.note_id = n.id
                      where notes_fts match ?2
                            and d.user_id = ?1
                            and (dm.role is null or dm.role <> 'system')
                      group by d.id
                      order by rank asc) res
                group by res.id, res.kind, res.name
                order by sum(res.rank) asc, length(res.name) asc
                limit 30";
        let results_via_notes: Vec<SearchDeck> = sqlite::many(&conn, stmt, params![&user_id, &q])?;
        for r in results_via_notes {
            if !contains(&results, r.deck.id) {
                results.push(r);
            }
        }
    }

    for r in results_via_points {
        if !contains(&results, r.deck.id) {
            results.push(r);
        }
    }

    Ok(results)
}
