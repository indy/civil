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

use crate::interop::decks::{BackDeck, DeckKind, Ref, RefKind, SlimDeck};
use crate::interop::font::Font;
use crate::interop::notes as interop;
use crate::interop::Key;

#[allow(unused_imports)]
use tracing::{error, info};

use crate::db::sqlite::{self, SqlitePool};
use rusqlite::{params, Connection, Row};

use std::str::FromStr;

fn note_sans_refs_from_row(row: &Row) -> crate::Result<interop::Note> {
    let sql_kind: i32 = row.get(2)?;
    let fnt: i32 = row.get(5)?;

    Ok(interop::Note {
        id: row.get(0)?,
        prev_note_id: row.get(4)?,
        kind: interop::NoteKind::try_from(sql_kind)?,
        content: row.get(1)?,
        point_id: row.get(3)?,
        font: Font::try_from(fnt)?,
        refs: vec![],
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

// represents the data returned in a single row of a query
//
#[derive(Debug)]
pub struct NoteAndRefAndDeck {
    pub note: interop::Note,
    pub reference_maybe: Option<Ref>,
    pub deck: SlimDeck,
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
            refs: vec![],
        },
        reference_maybe,
    })
}

fn note_and_ref_and_deck_from_row(row: &Row) -> crate::Result<NoteAndRefAndDeck> {
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

    let deck_deck_kind: String = row.get(16)?;
    let deck_fnt: i32 = row.get(19)?;

    Ok(NoteAndRefAndDeck {
        note: interop::Note {
            id: row.get(0)?,
            prev_note_id: row.get(1)?,
            kind: interop::NoteKind::try_from(note_kind_i32)?,
            content: row.get(3)?,
            point_id: row.get(4)?,
            font: Font::try_from(note_font)?,
            refs: vec![],
        },
        reference_maybe,
        deck: SlimDeck {
            id: row.get(14)?,
            title: row.get(15)?,
            deck_kind: DeckKind::from_str(&deck_deck_kind)?,
            graph_terminator: row.get(17)?,
            insignia: row.get(18)?,
            font: Font::try_from(deck_fnt)?,
        },
    })
}

// get all notes that are children of the given deck
//
pub(crate) fn notes_for_deck(
    sqlite_pool: &SqlitePool,
    deck_id: Key,
) -> crate::Result<Vec<interop::Note>> {
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

fn notes_from_notes_and_refs(notes_and_refs: Vec<NoteAndRef>) -> crate::Result<Vec<interop::Note>> {
    let mut res: Vec<interop::Note> = vec![];

    for note_and_ref in notes_and_refs {
        // only check the last element in the vector since the rows have been ordered by note id
        //
        if res.is_empty() || res[res.len() - 1].id != note_and_ref.note.id {
            res.push(interop::Note {
                refs: vec![],
                ..note_and_ref.note
            });
        }

        if let Some(reference) = note_and_ref.reference_maybe {
            let len = res.len();
            res[len - 1].refs.push(reference);
        }
    }

    Ok(res)
}

pub(crate) fn backdecks_for_deck(
    sqlite_pool: &SqlitePool,
    deck_id: Key,
) -> crate::Result<Vec<BackDeck>> {
    let conn = sqlite_pool.get()?;

    let stmt = "SELECT   n.id,
                         n.prev_note_id,
                         n.kind,
                         n.content,
                         n.point_id,
                         n.font,
                         nd2.kind as ref_kind,
                         nd2.annotation,
                         d3.id,
                         d3.name,
                         d3.kind as deck_kind,
                         d3.graph_terminator,
                         d3.insignia,
                         d3.font,
                         owner_deck.id,
                         owner_deck.name,
                         owner_deck.kind as deck_kind,
                         owner_deck.graph_terminator,
                         owner_deck.insignia,
                         owner_deck.font
                FROM     notes_decks nd
                         FULL JOIN notes n on nd.note_id = n.id
                         FULL JOIN decks owner_deck on n.deck_id = owner_deck.id
                         FULL JOIN notes_decks nd2 on nd2.note_id = n.id
                         FULL JOIN decks d3 on nd2.deck_id = d3.id
                WHERE    nd.deck_id = ?1
                ORDER BY owner_deck.id, n.id";
    let notes_and_refs_and_decks: Vec<NoteAndRefAndDeck> = sqlite::many(
        &conn,
        stmt,
        params!(&deck_id),
        note_and_ref_and_deck_from_row,
    )?;

    let notes = backnotes_from_notes_and_refs_and_decks(notes_and_refs_and_decks)?;

    Ok(notes)
}

fn backnotes_from_notes_and_refs_and_decks(
    notes_and_refs_and_decks: Vec<NoteAndRefAndDeck>,
) -> crate::Result<Vec<BackDeck>> {
    let mut res: Vec<BackDeck> = vec![];

    for note_and_ref_and_deck in notes_and_refs_and_decks {
        // only check the last element in the vector since the rows have been ordered by note id
        //
        if res.is_empty() || res[res.len() - 1].deck.id != note_and_ref_and_deck.deck.id {
            res.push(BackDeck {
                notes: vec![],
                deck: note_and_ref_and_deck.deck,
            });
        }

        let idx = res.len() - 1;
        let notes = &mut res[idx].notes;
        if notes.is_empty() || notes[notes.len() - 1].id != note_and_ref_and_deck.note.id {
            notes.push(interop::Note {
                refs: vec![],
                ..note_and_ref_and_deck.note
            });
        }

        if let Some(reference) = note_and_ref_and_deck.reference_maybe {
            let len = res.len();
            let len2 = res[len - 1].notes.len();
            res[len - 1].notes[len2 - 1].refs.push(reference);
        }
    }

    Ok(res)
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
    let all_notes = notes_for_deck(sqlite_pool, deck_id)?;
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
        note_sans_refs_from_row,
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

    let all_notes = notes_for_deck(sqlite_pool, note.deck_id)?;
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
    let notes = sqlite::many(
        &conn,
        stmt,
        params![&deck_id, &user_id],
        note_sans_refs_from_row,
    )?;

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

// isg todo: this won't get the note's refs, so maybe use two queries: one to edit another to return the full note
//
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
        note_sans_refs_from_row,
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
    sqlite::many(&conn, stmt, &[], note_sans_refs_from_row)
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
