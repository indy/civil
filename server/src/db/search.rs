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

use crate::db::decks::slimdeck_from_row;
use crate::db::notes::backdecks_for_deck;
use crate::db::sqlite::{self, SqlitePool};
use crate::db::{postfix_asterisks, sanitize_for_sqlite_match};
use crate::interop::decks as interop;
use crate::interop::decks::{DeckKind, Ref, RefKind, SlimDeck};
use crate::interop::font::Font;
use crate::interop::notes::{Note, NoteKind};
use crate::interop::search as interop_search;
use crate::interop::Key;
use rusqlite::{params, Connection, Row};

use std::str::FromStr;
#[allow(unused_imports)]
use tracing::{info, warn};

#[derive(Debug)]
struct SeekDeckNoteRef {
    pub rank: f32,
    pub deck: SlimDeck,
    pub note: Note,
    pub reference_maybe: Option<Ref>,
}

fn contains(slimdecks: &[SlimDeck], id: Key) -> bool {
    slimdecks.iter().any(|br| br.id == id)
}

fn seekdecknoteref_from_row(row: &Row) -> crate::Result<SeekDeckNoteRef> {
    let deck_kind_str: String = row.get(3)?;
    let deck_font: i32 = row.get(6)?;

    let note_kind_i32: i32 = row.get(9)?;
    let note_font: i32 = row.get(12)?;

    let mut reference_maybe: Option<Ref> = None;
    let reference_deck_id: Option<Key> = row.get(13)?;
    if let Some(ref_deck_id) = reference_deck_id {
        let refk: String = row.get(14)?;
        let ref_deck_kind: String = row.get(17)?;
        let ref_fnt: i32 = row.get(20)?;

        reference_maybe = Some(Ref {
            note_id: row.get(7)?,
            ref_kind: RefKind::from_str(&refk)?,
            annotation: row.get(15)?,

            id: ref_deck_id,
            title: row.get(16)?,
            deck_kind: DeckKind::from_str(&ref_deck_kind)?,
            graph_terminator: row.get(18)?,
            insignia: row.get(19)?,
            font: Font::try_from(ref_fnt)?,
        })
    };

    Ok(SeekDeckNoteRef {
        rank: row.get(0)?,
        deck: SlimDeck {
            id: row.get(1)?,
            title: row.get(2)?,
            deck_kind: DeckKind::from_str(&deck_kind_str)?,
            graph_terminator: row.get(4)?,
            insignia: row.get(5)?,
            font: Font::try_from(deck_font)?,
        },
        note: Note {
            id: row.get(7)?,
            prev_note_id: row.get(8)?,
            kind: NoteKind::try_from(note_kind_i32)?,
            content: row.get(10)?,
            point_id: row.get(11)?,
            font: Font::try_from(note_font)?,
            refs: vec![],
        },
        reference_maybe,
    })
}

pub(crate) fn search(
    sqlite_pool: &SqlitePool,
    user_id: Key,
    query: &str,
) -> crate::Result<Vec<interop_search::SeekDeck>> {
    let conn = sqlite_pool.get()?;

    let q = postfix_asterisks(query)?;

    let stmt =
        "select d.id, d.name, d.kind, d.insignia, d.font, d.graph_terminator, decks_fts.rank AS rank_sum, 1 as rank_count
                from decks_fts left join decks d on d.id = decks_fts.rowid
                where decks_fts match ?2
                      and d.user_id = ?1
                group by d.id
                order by rank_sum asc, length(d.name) asc, d.created_at desc
                limit 30";
    let mut results = sqlite::many(&conn, stmt, params![&user_id, &q], slimdeck_from_row)?;

    let stmt = "select d.id, d.name, d.kind, d.insignia, d.font, d.graph_terminator, article_extras_fts.rank AS rank_sum, 1 as rank_count
                from article_extras_fts left join decks d on d.id = article_extras_fts.rowid
                where article_extras_fts match ?2
                      and d.user_id = ?1
                group by d.id
                order by rank_sum asc, length(d.name) asc
                limit 30";
    let results_via_pub_ext = sqlite::many(&conn, stmt, params![&user_id, &q], slimdeck_from_row)?;

    let stmt = "select d.id, d.name, d.kind, d.insignia, d.font, d.graph_terminator, quote_extras_fts.rank AS rank_sum, 1 as rank_count
                from quote_extras_fts left join decks d on d.id = quote_extras_fts.rowid
                where quote_extras_fts match ?2
                      and d.user_id = ?1
                group by d.id
                order by rank_sum asc, length(d.name) asc
                limit 30";
    let results_via_quote_ext =
        sqlite::many(&conn, stmt, params![&user_id, &q], slimdeck_from_row)?;

    let stmt = "select res.id, res.name, res.kind, res.insignia, res.font, res.graph_terminator, sum(res.rank) as rank_sum, count(res.rank) as rank_count
                from (select d.id, d.name, d.kind, d.insignia, d.font, d.graph_terminator, notes_fts.rank AS rank
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
    let results_via_notes = sqlite::many(&conn, stmt, params![&user_id, &q], slimdeck_from_row)?;

    let stmt = "select res.id, res.name, res.kind, res.insignia, res.font, res.graph_terminator, sum(res.rank) as rank_sum, count(res.rank) as rank_count
                from (select d.id, d.name, d.kind, d.insignia, d.font, d.graph_terminator, points_fts.rank AS rank
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
    let results_via_points = sqlite::many(&conn, stmt, params![&user_id, &q], slimdeck_from_row)?;

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

    let res = slim_decks_to_seek_decks(results);

    Ok(res)
}

fn slim_decks_to_seek_decks(slimdecks: Vec<interop::SlimDeck>) -> Vec<interop_search::SeekDeck> {
    // todo: use a From trait???
    slimdecks
        .iter()
        .map(|slim| interop_search::SeekDeck {
            rank: 0.0,
            deck: interop::SlimDeck {
                id: slim.id,
                title: slim.title.to_string(),
                deck_kind: slim.deck_kind,
                graph_terminator: slim.graph_terminator,
                insignia: slim.insignia,
                font: slim.font,
            },
            seek_notes: vec![],
        })
        .collect()
}

pub(crate) fn search_by_name(
    sqlite_pool: &SqlitePool,
    user_id: Key,
    query: &str,
) -> crate::Result<Vec<interop_search::SeekDeck>> {
    let conn = sqlite_pool.get()?;

    let stmt =
        "select d.id, d.name, d.kind, d.insignia, d.font, d.graph_terminator, decks_fts.rank AS rank_sum, 1 as rank_count
                from decks_fts left join decks d on d.id = decks_fts.rowid
                where decks_fts match ?2
                      and d.user_id = ?1
                group by d.id
                order by rank_sum asc, length(d.name) asc
                limit 20";
    let mut results = sqlite::many(&conn, stmt, params![&user_id, &query], slimdeck_from_row)?;

    let stmt =
        "select id, name, kind, insignia, font, graph_terminator, 0 as rank_sum, 1 as rank_count
                from decks
                where name like '%' || ?2 || '%'
                and user_id = ?1
                limit 20";
    let res2 = sqlite::many(&conn, stmt, params![&user_id, &query], slimdeck_from_row)?;

    for r in res2 {
        if !contains(&results, r.id) {
            results.push(r);
        }
    }

    let res = slim_decks_to_seek_decks(results);

    Ok(res)
}

pub(crate) fn additional_search(
    sqlite_pool: &SqlitePool,
    user_id: Key,
    deck_id: Key,
) -> crate::Result<Vec<interop_search::SeekDeck>> {
    info!("additional_search {:?}", deck_id);

    fn has(slimdeck: &interop::SlimDeck, backdecks: &[interop::BackDeck]) -> bool {
        backdecks.iter().any(|br| br.deck.id == slimdeck.id)
    }

    let backnotes = backdecks_for_deck(sqlite_pool, deck_id)?;
    let search_results = search_using_deck_id(sqlite_pool, user_id, deck_id)?;

    // dedupe search results against the backdecks
    let additional_search_results: Vec<interop::SlimDeck> = search_results
        .into_iter()
        .filter(|br| br.id != deck_id && !has(br, &backnotes))
        .collect();

    let res = slim_decks_to_seek_decks(additional_search_results);

    Ok(res)
}

fn get_name_of_deck(conn: &Connection, deck_id: Key) -> crate::Result<String> {
    fn string_from_row(row: &Row) -> crate::Result<String> {
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

fn search_using_deck_id(
    sqlite_pool: &SqlitePool,
    user_id: Key,
    deck_id: Key,
) -> crate::Result<Vec<interop::SlimDeck>> {
    let conn = sqlite_pool.get()?;

    let name = get_name_of_deck(&conn, deck_id)?;
    let sane_name = sanitize_for_sqlite_match(name)?;

    if sane_name.is_empty() {
        return Ok(vec![]);
    }

    let stmt =
        "select d.id, d.name, d.kind, d.insignia, d.font, d.graph_terminator, decks_fts.rank AS rank_sum, 1 as rank_count
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
        slimdeck_from_row,
    )?;

    let stmt = "select d.id, d.name, d.kind, d.insignia, d.font, d.graph_terminator, article_extras_fts.rank AS rank_sum, 1 as rank_count
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
        slimdeck_from_row,
    )?;

    let stmt = "select d.id, d.name, d.kind, d.insignia, d.font, d.graph_terminator, quote_extras_fts.rank AS rank_sum, 1 as rank_count
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
        slimdeck_from_row,
    )?;

    // let stmt = "select res.id, res.name, res.kind, res.insignia, res.font, res.graph_terminator, sum(res.rank) as rank_sum, count(res.rank) as rank_count
    //             from (select d.id, d.name, d.kind, d.insignia, d.font, d.graph_terminator, notes_fts.rank AS rank
    //                   from notes_fts
    //                        left join notes n on n.id = notes_fts.rowid
    //                        left join decks d on d.id = n.deck_id
    //                   where notes_fts match ?2
    //                         and d.user_id = ?1
    //                   group by d.id
    //                   order by rank asc) res
    //             group by res.id, res.kind, res.name
    //             order by sum(res.rank) asc, length(res.name) asc
    //             limit 50";
    // let results_via_notes = sqlite::many(
    //     &conn,
    //     stmt,
    //     params![&user_id, &sane_name],
    //     slimdeck_from_row,
    // )?;

    let stmt = "select res.id, res.name, res.kind, res.insignia, res.font, res.graph_terminator, sum(res.rank) as rank_sum, count(res.rank) as rank_count
                from (select d.id, d.name, d.kind, d.insignia, d.font, d.graph_terminator, points_fts.rank AS rank
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
        slimdeck_from_row,
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

    // for r in results_via_notes {
    //     if !contains(&results, r.id) {
    //         results.push(r);
    //     }
    // }

    for r in results_via_points {
        if !contains(&results, r.id) {
            results.push(r);
        }
    }

    Ok(results)
}

pub(crate) fn notes_additional_search(
    sqlite_pool: &SqlitePool,
    user_id: Key,
    deck_id: Key,
) -> crate::Result<Vec<interop_search::SeekDeck>> {
    let seek_deck_note_refs = seek_deck_additional_query(sqlite_pool, user_id, deck_id)?;
    let seek_deck = build_seek_deck(seek_deck_note_refs)?;

    // given a search for 'dogs'
    // if there was a deck (dx) that had a note (nx) that had references to 'dogs' and 'cats'
    // then the query would still return a row corressponding to deck dx, note nx and ref 'cats'
    //
    // so the query has been changed to return all references including 'dogs'
    // then we can use some rust to filter out any notes that contain refs to 'dogs'
    //
    let seek_deck_b: Vec<interop_search::SeekDeck> = seek_deck
        .into_iter()
        .map(|seek_deck| remove_notes_with_refs_to_deck_id(seek_deck, deck_id))
        .collect();

    // now that some of the notes have been removed, there may be some decks that have no notes.
    // remove those decks as well
    //
    let seek_deck_c: Vec<interop_search::SeekDeck> = seek_deck_b
        .into_iter()
        .filter(|seek_deck| seek_deck.seek_notes.len() != 0)
        .collect();

    Ok(seek_deck_c)
}

fn build_seek_deck(
    seek_deck_note_refs: Vec<SeekDeckNoteRef>,
) -> crate::Result<Vec<interop_search::SeekDeck>> {
    let mut res: Vec<interop_search::SeekDeck> = vec![];

    for sdnr in seek_deck_note_refs {
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
            res.push(interop_search::SeekDeck {
                rank: sdnr.rank,
                deck: sdnr.deck,
                seek_notes: vec![],
            });
        }

        found = false;
        let mut note_index: usize = 0;
        for n in &res[deck_index].seek_notes {
            if n.id == sdnr.note.id {
                found = true;
                break;
            }
            note_index += 1;
        }
        if !found {
            res[deck_index].seek_notes.push(sdnr.note)
        }

        if let Some(rrr) = sdnr.reference_maybe {
            res[deck_index].seek_notes[note_index].refs.push(rrr);
        }
    }

    Ok(res)
}

pub(crate) fn seek(
    sqlite_pool: &SqlitePool,
    user_id: Key,
    query: &str,
) -> crate::Result<Vec<interop_search::SeekDeck>> {
    let seek_deck_note_refs = seek_query(sqlite_pool, user_id, query)?;
    build_seek_deck(seek_deck_note_refs)
}

fn has_ref_to_deck_id(seek_note: &Note, deck_id: Key) -> bool {
    seek_note
        .refs
        .iter()
        .any(|reference| reference.id == deck_id)
}

fn remove_notes_with_refs_to_deck_id(
    seek_deck: interop_search::SeekDeck,
    deck_id: Key,
) -> interop_search::SeekDeck {
    interop_search::SeekDeck {
        rank: seek_deck.rank,
        deck: seek_deck.deck,
        seek_notes: seek_deck
            .seek_notes
            .into_iter()
            .filter(|seek_note| !has_ref_to_deck_id(seek_note, deck_id))
            .collect(),
    }
}

fn seek_query(
    sqlite_pool: &SqlitePool,
    user_id: Key,
    query: &str,
) -> crate::Result<Vec<SeekDeckNoteRef>> {
    let conn = sqlite_pool.get()?;
    let q = postfix_asterisks(query)?;

    let stmt = "SELECT notes_fts.rank AS rank,
                       d.id, d.name, d.kind, d.graph_terminator, d.insignia, d.font,
                       n.id, n.prev_note_id, n.kind,
                       highlight(notes_fts, 0, ':searched(', ')') as content,
                       n.point_id, n.font,
                       nd.deck_id, nd.kind, nd.annotation, d2.name, d2.kind,
                       d2.graph_terminator, d2.insignia, d2.font
               FROM notes_fts
                    LEFT JOIN notes n ON n.id = notes_fts.rowid
                    LEFT JOIN decks d ON d.id = n.deck_id
                    LEFT JOIN dialogue_messages dm ON dm.note_id = n.id
                    LEFT JOIN notes_decks nd on nd.note_id = n.id
                    LEFT JOIN decks d2 on d2.id = nd.deck_id
               WHERE notes_fts match ?2
                     AND d.user_id = ?1
                     AND (dm.role IS null OR dm.role <> 'system')
               ORDER BY rank ASC
               LIMIT 100";
    let results = sqlite::many(&conn, stmt, params![&user_id, &q], seekdecknoteref_from_row)?;
    Ok(results)
}

// only searching via notes for the moment, will have to add additional search queries that look in points, article_extras etc
//
fn seek_deck_additional_query(
    sqlite_pool: &SqlitePool,
    user_id: Key,
    deck_id: Key,
) -> crate::Result<Vec<SeekDeckNoteRef>> {
    let conn = sqlite_pool.get()?;

    let name = get_name_of_deck(&conn, deck_id)?;
    let sane_name = sanitize_for_sqlite_match(name)?;

    if sane_name.is_empty() {
        return Ok(vec![]);
    }

    let stmt = "SELECT notes_fts.rank AS rank,
                       d.id, d.name, d.kind, d.graph_terminator, d.insignia, d.font,
                       n.id, n.prev_note_id, n.kind,
                       highlight(notes_fts, 0, ':searched(', ')') as content,
                       n.point_id, n.font,
                       nd.deck_id, nd.kind, nd.annotation, d2.name, d2.kind,
                       d2.graph_terminator, d2.insignia, d2.font
               FROM notes_fts
                    LEFT JOIN notes n ON n.id = notes_fts.rowid
                    LEFT JOIN decks d ON d.id = n.deck_id
                    LEFT JOIN dialogue_messages dm ON dm.note_id = n.id
                    LEFT JOIN notes_decks nd on nd.note_id = n.id
                    LEFT JOIN decks d2 on d2.id = nd.deck_id
               WHERE notes_fts match ?2
                     AND d.user_id = ?1
                     AND d.id <> ?3
                     AND (dm.role IS null OR dm.role <> 'system')
               ORDER BY rank ASC
               LIMIT 100";

    sqlite::many(
        &conn,
        stmt,
        params![&user_id, &sane_name, &deck_id],
        seekdecknoteref_from_row,
    )
}
