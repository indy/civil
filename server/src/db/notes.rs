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

use crate::db::{postfix_asterisks, sanitize_for_sqlite_match};

use crate::db::decks as db_decks;
use crate::interop::decks::{DeckKind, Ref, RefKind, SlimDeck};
use crate::interop::font::Font;
use crate::interop::notes as interop;
use crate::interop::Key;

#[allow(unused_imports)]
use tracing::{error, info};

use crate::db::sqlite::{self, SqlitePool};
use rusqlite::{params, Connection, Row};

use std::str::FromStr;

fn note_from_row(row: &Row) -> crate::Result<interop::Note> {
    let sql_kind: i32 = row.get(2)?;
    let fnt: i32 = row.get(5)?;

    Ok(interop::Note {
        id: row.get(0)?,
        prev_note_id: row.get(4)?,
        kind: interop::NoteKind::try_from(sql_kind)?,
        content: row.get(1)?,
        point_id: row.get(3)?,
        font: Font::try_from(fnt)?,
    })
}

fn key_from_row(row: &Row) -> crate::Result<Key> {
    Ok(row.get(0)?)
}

fn option_key_from_row(row: &Row) -> crate::Result<Option<Key>> {
    Ok(row.get(0)?)
}

// represents the data returned in a single row of a query
//
#[derive(Debug)]
pub struct NoteAndRef {
    pub note: interop::Note,
    pub reference_maybe: Option<Ref>,
}

fn note_and_ref_from_row(row: &Row) -> crate::Result<NoteAndRef> {
    let mut reference_maybe: Option<Ref> = None;
    let reference_deck_id: Option<Key> = row.get(8)?;
    if let Some(ref_deck_id) = reference_deck_id {
        let refk: String = row.get(6)?;
        let ref_deck_kind: String = row.get(10)?;
        let ref_fnt: i32 = row.get(13)?;

        reference_maybe = Some(Ref {
            note_id: row.get(0)?,
            ref_kind: RefKind::from_str(&refk)?,
            annotation: row.get(7)?,

            id: ref_deck_id,
            title: row.get(9)?,
            deck_kind: DeckKind::from_str(&ref_deck_kind)?,
            graph_terminator: row.get(11)?,
            insignia: row.get(12)?,
            font: Font::try_from(ref_fnt)?,
        })
    };

    let note_kind_i32: i32 = row.get(2)?;
    let note_font: i32 = row.get(5)?;

    Ok(NoteAndRef {
        note: interop::Note {
            id: row.get(0)?,
            prev_note_id: row.get(1)?,
            kind: interop::NoteKind::try_from(note_kind_i32)?,
            content: row.get(3)?,
            point_id: row.get(4)?,
            font: Font::try_from(note_font)?,
        },
        reference_maybe,
    })
}

// get all notes that are children of the given deck
//
pub(crate) fn for_deck(
    sqlite_pool: &SqlitePool,
    deck_id: Key,
) -> crate::Result<Vec<interop::NewNote>> {
    let conn = sqlite_pool.get()?;

    let stmt = "SELECT   n.id,
                         n.prev_note_id,
                         n.kind,
                         n.content,
                         n.point_id,
                         n.font,
                         nd.kind as ref_kind,
                         nd.annotation,
                         d.id,
                         d.name,
                         d.kind as deck_kind,
                         d.graph_terminator,
                         d.insignia,
                         d.font
                FROM     notes n
                         FULL JOIN notes_decks nd on nd.note_id = n.id
                         FULL JOIN decks d on nd.deck_id = d.id
                WHERE    n.deck_id = ?1
                ORDER BY n.id";
    let notes_and_refs: Vec<NoteAndRef> =
        sqlite::many(&conn, stmt, params!(&deck_id), note_and_ref_from_row)?;

    let notes = notes_from_notes_and_refs(notes_and_refs)?;

    Ok(notes)
}

// todo: write a notes_from_ordered_notes_and_refs where the .note.id is in order
// the nested for loop can then be replaced by indexing into the last element
//
fn notes_from_notes_and_refs(
    notes_and_refs: Vec<NoteAndRef>,
) -> crate::Result<Vec<interop::NewNote>> {
    let mut res: Vec<interop::NewNote> = vec![];

    for note_and_ref in notes_and_refs {
        let mut found: bool = false;
        let mut note_index: usize = 0;
        for r in &res {
            if r.id == note_and_ref.note.id {
                found = true;
                break;
            }
            note_index += 1;
        }
        if !found {
            // todo: replace with:
            // res.push(interop::NewNote {
            //     refs: vec![],
            //     ..note_and_ref.note
            // });

            res.push(interop::NewNote {
                id: note_and_ref.note.id,
                prev_note_id: note_and_ref.note.prev_note_id,
                kind: note_and_ref.note.kind,
                content: note_and_ref.note.content,
                point_id: note_and_ref.note.point_id,
                font: note_and_ref.note.font,
                refs: vec![],
            });
        }

        if let Some(reference) = note_and_ref.reference_maybe {
            res[note_index].refs.push(reference);
        }
    }

    Ok(res)
}

pub(crate) fn all_from_deck(
    sqlite_pool: &SqlitePool,
    deck_id: Key,
) -> crate::Result<Vec<interop::Note>> {
    let conn = sqlite_pool.get()?;

    let stmt = "SELECT n.id,
                       n.content,
                       n.kind,
                       n.point_id,
                       n.prev_note_id,
                       n.font
                FROM notes n
                WHERE n.deck_id = ?1
                ORDER BY n.id";
    sqlite::many(&conn, stmt, params!(&deck_id), note_from_row)
}

pub(crate) fn delete_note_properly(
    sqlite_pool: &SqlitePool,
    user_id: Key,
    note_id: Key,
) -> crate::Result<Vec<interop::Note>> {
    let mut conn = sqlite_pool.get()?;
    let tx = conn.transaction()?;

    let stmt = "SELECT deck_id
                FROM notes
                WHERE id = ?1";
    let deck_id = sqlite::one(&tx, stmt, params![&note_id], key_from_row)?;

    // point the next note to the previous note
    let stmt = "SELECT id
                FROM notes
                WHERE prev_note_id = ?1";
    let next_ids = sqlite::many(&tx, stmt, params![&note_id], key_from_row)?;
    if next_ids.len() == 1 {
        let next_id = next_ids[0];

        // correctly set the next note's prev_note_id
        let stmt = "SELECT prev_note_id
                    FROM notes
                    WHERE id = ?1 AND user_id = ?2";
        let prev_note_id: Option<Key> =
            sqlite::one(&tx, stmt, params![&note_id, &user_id], option_key_from_row)?;

        if let Some(prev_note_id) = prev_note_id {
            // if there is a note that points to this note, change it to point to prev_note_id
            update_prev_note_id(&tx, next_id, prev_note_id)?;
        } else {
            // if there is a note that points to this note, change it to point to null
            clear_prev_note_id(&tx, next_id)?;
        }
    }

    // actually delete the note
    let stmt = "DELETE
                FROM notes_decks
                WHERE note_id = ?1";
    sqlite::zero(&tx, stmt, params![&note_id])?;

    let stmt = "DELETE
                FROM notes
                WHERE id = ?1 AND user_id = ?2";
    sqlite::zero(&tx, stmt, params![&note_id, &user_id])?;

    tx.commit()?;

    // return all the notes that the parent deck has
    let all_notes = all_from_deck(sqlite_pool, deck_id)?;
    Ok(all_notes)
}

pub(crate) fn create_common(
    conn: &Connection,
    user_id: Key,
    deck_id: Key,
    font: Font,
    kind: interop::NoteKind,
    point_id: Option<Key>,
    content: &str,
    prev_note_id: Option<Key>,
    next_note_id: Option<Key>,
) -> crate::Result<interop::Note> {
    let stmt = "INSERT INTO notes(user_id, deck_id, font, kind, point_id, content, prev_note_id)
                VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)
                RETURNING id, content, kind, point_id, prev_note_id, font";
    let note = sqlite::one(
        conn,
        stmt,
        params![
            &user_id,
            &deck_id,
            i32::from(font),
            &i32::from(kind),
            &point_id,
            &content,
            &prev_note_id
        ],
        note_from_row,
    )?;

    if let Some(next_note_id) = next_note_id {
        update_prev_note_id(conn, next_note_id, note.id)?;
    }

    Ok(note)
}

// note: this should be part of a transaction
//
pub(crate) fn create_note_deck_meta(
    tx: &Connection,
    user_id: Key,
    deck_id: Key,
) -> crate::Result<interop::Note> {
    create_common(
        tx,
        user_id,
        deck_id,
        Font::Serif,
        interop::NoteKind::NoteDeckMeta,
        None,
        "",
        None,
        None,
    )
}

pub(crate) fn create_notes(
    sqlite_pool: &SqlitePool,
    user_id: Key,
    note: &interop::ProtoNote,
) -> crate::Result<Vec<interop::Note>> {
    // let mut notes: Vec<interop::Note> = Vec::new();
    let mut conn = sqlite_pool.get()?;
    let tx = conn.transaction()?;

    let mut new_prev = note.prev_note_id;
    let next_note_id = note.next_note_id;

    if let Some(next_note_id) = next_note_id {
        // when the ProtoNote has a Some(next_note_id) then it can have a None for prev_note_id,
        // it's upto this code to get the correct prev_note_id
        new_prev = get_prev_note_id(sqlite_pool, next_note_id)?;
    }

    let mut it = note.content.iter().peekable();
    while let Some(content) = it.next() {
        if content.is_empty() {
            // this empty check was on the client side, moving it hear,
            // although not sure how often it's triggered
            //
            continue;
        }

        let new_note = create_common(
            &tx,
            user_id,
            note.deck_id,
            note.font,
            note.kind,
            note.point_id,
            content,
            new_prev,
            if it.peek().is_none() {
                next_note_id
            } else {
                None
            },
        )?;
        new_prev = Some(new_note.id);
        // notes.push(new_note);
    }

    tx.commit()?;

    let all_notes = all_from_deck(sqlite_pool, note.deck_id)?;
    Ok(all_notes)
}

fn update_prev_note_id(conn: &Connection, note_id: Key, prev_note_id: Key) -> crate::Result<()> {
    let stmt = "UPDATE notes
                SET prev_note_id = ?2
                WHERE id = ?1";
    sqlite::zero(conn, stmt, params![&note_id, &prev_note_id])
}

fn clear_prev_note_id(conn: &Connection, note_id: Key) -> crate::Result<()> {
    let stmt = "UPDATE notes
                SET prev_note_id = null
                WHERE id = ?1";
    sqlite::zero(conn, stmt, params![&note_id])
}

pub(crate) fn preview(
    sqlite_pool: &SqlitePool,
    user_id: Key,
    deck_id: Key,
) -> crate::Result<interop::PreviewNotes> {
    let conn = sqlite_pool.get()?;

    let stmt = "SELECT n.id,
                       n.content,
                       n.kind,
                       n.point_id,
                       n.prev_note_id,
                       n.font
                FROM notes n
                WHERE n.point_id is null AND n.deck_id = ?1 AND n.user_id = ?2";
    let notes = sqlite::many(&conn, stmt, params![&deck_id, &user_id], note_from_row)?;

    Ok(interop::PreviewNotes { deck_id, notes })
}

pub(crate) fn add_auto_summary(
    sqlite_pool: &SqlitePool,
    user_id: Key,
    deck_id: Key,
    prev_id: Option<Key>,
    summary: &str,
) -> crate::Result<interop::Note> {
    let conn = sqlite_pool.get()?;
    create_common(
        &conn,
        user_id,
        deck_id,
        Font::AI,
        interop::NoteKind::NoteSummary,
        None,
        summary,
        prev_id,
        None,
    )
}

pub fn edit_note(
    sqlite_pool: &SqlitePool,
    user_id: Key,
    note: &interop::Note,
    note_id: Key,
) -> crate::Result<interop::Note> {
    let conn = sqlite_pool.get()?;
    let stmt = "UPDATE notes
                SET content = ?3, font= ?4
                WHERE id = ?2 AND user_id = ?1
                RETURNING id, content, kind, point_id, prev_note_id, font";
    sqlite::one(
        &conn,
        stmt,
        params![&user_id, &note_id, &note.content, &i32::from(note.font)],
        note_from_row,
    )
}

pub fn get_all_notes_in_db(sqlite_pool: &SqlitePool) -> crate::Result<Vec<interop::Note>> {
    let conn = sqlite_pool.get()?;
    let stmt = "SELECT n.id,
                       n.content,
                       n.kind,
                       n.point_id,
                       n.prev_note_id,
                       n.font
                FROM   notes n
                ORDER BY n.id";
    sqlite::many(&conn, stmt, &[], note_from_row)
}

fn get_prev_note_id(sqlite_pool: &SqlitePool, id: Key) -> crate::Result<Option<Key>> {
    fn prev_id_from_row(row: &Row) -> crate::Result<Option<Key>> {
        Ok(row.get(0)?)
    }

    let conn = sqlite_pool.get()?;
    let stmt = "SELECT prev_note_id
                FROM   notes
                WHERE  id=?1";
    sqlite::one(&conn, stmt, &[&id], prev_id_from_row)
}

pub(crate) fn replace_note_fonts(
    conn: &Connection,
    user_id: Key,
    deck_id: Key,
    original_font: Font,
    new_font: Font,
) -> crate::Result<()> {
    let stmt = "UPDATE notes
                SET font = ?4
                WHERE user_id = ?1 AND deck_id = ?2 AND font = ?3";

    sqlite::zero(
        conn,
        stmt,
        params![
            &user_id,
            &deck_id,
            &i32::from(original_font),
            &i32::from(new_font)
        ],
    )
}

pub(crate) fn overwrite_note_fonts(
    conn: &Connection,
    user_id: Key,
    deck_id: Key,
    new_font: Font,
) -> crate::Result<()> {
    let stmt = "UPDATE notes
                SET font = ?3
                WHERE user_id = ?1 AND deck_id = ?2 AND font <> ?3";

    sqlite::zero(
        conn,
        stmt,
        params![&user_id, &deck_id, &i32::from(new_font)],
    )
}

#[derive(Debug)]
struct SeekDeckNoteRef {
    pub rank: f32,
    pub deck: SlimDeck,
    pub note: interop::Note,
    pub reference_maybe: Option<Ref>,
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
        note: interop::Note {
            id: row.get(7)?,
            prev_note_id: row.get(8)?,
            kind: interop::NoteKind::try_from(note_kind_i32)?,
            content: row.get(10)?,
            point_id: row.get(11)?,
            font: Font::try_from(note_font)?,
        },
        reference_maybe,
    })
}

pub(crate) fn seek(
    sqlite_pool: &SqlitePool,
    user_id: Key,
    query: &str,
) -> crate::Result<Vec<interop::SeekDeck>> {
    let seek_deck_note_refs = seek_query(sqlite_pool, user_id, query)?;
    build_seek_deck(seek_deck_note_refs)
}

fn has_ref_to_deck_id(seek_note: &interop::SeekNote, deck_id: Key) -> bool {
    seek_note
        .refs
        .iter()
        .any(|reference| reference.id == deck_id)
}

fn remove_notes_with_refs_to_deck_id(
    seek_deck: interop::SeekDeck,
    deck_id: Key,
) -> interop::SeekDeck {
    interop::SeekDeck {
        rank: seek_deck.rank,
        deck: seek_deck.deck,
        seek_notes: seek_deck
            .seek_notes
            .into_iter()
            .filter(|seek_note| !has_ref_to_deck_id(seek_note, deck_id))
            .collect(),
    }
}

pub(crate) fn additional_search(
    sqlite_pool: &SqlitePool,
    user_id: Key,
    deck_id: Key,
) -> crate::Result<Vec<interop::SeekDeck>> {
    let seek_deck_note_refs = seek_deck_additional_query(sqlite_pool, user_id, deck_id)?;
    let seek_deck = build_seek_deck(seek_deck_note_refs)?;

    // given a search for 'dogs'
    // if there was a deck (dx) that had a note (nx) that had references to 'dogs' and 'cats'
    // then the query would still return a row corressponding to deck dx, note nx and ref 'cats'
    //
    // so the query has been changed to return all references including 'dogs'
    // then we can use some rust to filter out any notes that contain refs to 'dogs'
    //
    let seek_deck_b: Vec<interop::SeekDeck> = seek_deck
        .into_iter()
        .map(|seek_deck| remove_notes_with_refs_to_deck_id(seek_deck, deck_id))
        .collect();

    // now that some of the notes have been removed, there may be some decks that have no notes.
    // remove those decks as well
    //
    let seek_deck_c: Vec<interop::SeekDeck> = seek_deck_b
        .into_iter()
        .filter(|seek_deck| seek_deck.seek_notes.len() != 0)
        .collect();

    Ok(seek_deck_c)
}

fn build_seek_deck(
    seek_deck_note_refs: Vec<SeekDeckNoteRef>,
) -> crate::Result<Vec<interop::SeekDeck>> {
    let mut res: Vec<interop::SeekDeck> = vec![];

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
            res.push(interop::SeekDeck {
                rank: sdnr.rank,
                deck: sdnr.deck,
                seek_notes: vec![],
            });
        }

        found = false;
        let mut note_index: usize = 0;
        for n in &res[deck_index].seek_notes {
            if n.note.id == sdnr.note.id {
                found = true;
                break;
            }
            note_index += 1;
        }
        if !found {
            res[deck_index].seek_notes.push(interop::SeekNote {
                note: sdnr.note,
                refs: vec![],
            })
        }

        if let Some(rrr) = sdnr.reference_maybe {
            res[deck_index].seek_notes[note_index].refs.push(rrr);
        }
    }

    Ok(res)
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

    let name = db_decks::get_name_of_deck(&conn, deck_id)?;
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
