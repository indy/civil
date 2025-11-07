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

use crate::db::memorise as memorise_db;
use crate::interop::decks::{Arrival, Ref, SlimDeck};
use crate::interop::font::Font;
use crate::interop::memorise::FlashCard;
use crate::interop::notes::{Note, NoteKind, PreviewNotes, ProtoNote};
use crate::interop::Key;

#[allow(unused_imports)]
use tracing::{error, info, warn};

use crate::db::sqlite::{self, FromRow};
use crate::db::{db, DbError, SqlitePool};
use rusqlite::{params, Connection, Row};

impl FromRow for Note {
    fn from_row(row: &Row) -> rusqlite::Result<Note> {
        Ok(Note {
            id: row.get(0)?,
            prev_note_id: row.get(4)?,
            kind: row.get(2)?,
            content: row.get(1)?,
            point_id: row.get(3)?,
            font: row.get(5)?,
            refs: vec![],
            flashcards: vec![],
        })
    }
}

// represents the data returned in a single row of a query
//
#[derive(Debug)]
pub struct NoteAndRef {
    pub note: Note,
    pub reference_maybe: Option<Ref>,
}

// represents the data returned in a single row of a query
//
#[derive(Debug)]
pub struct NoteAndRefAndDeck {
    pub note: Note,
    pub reference_maybe: Option<Ref>,
    pub deck: SlimDeck,
}

impl FromRow for NoteAndRef {
    fn from_row(row: &Row) -> rusqlite::Result<NoteAndRef> {
        let mut reference_maybe: Option<Ref> = None;
        let reference_deck_id: Option<Key> = row.get(8)?;
        if let Some(ref_deck_id) = reference_deck_id {
            reference_maybe = Some(Ref {
                note_id: row.get(0)?,
                ref_kind: row.get(6)?,
                annotation: row.get(7)?,
                id: ref_deck_id,
                title: row.get(9)?,
                deck_kind: row.get(10)?,
                created_at: row.get(11)?,
                graph_terminator: row.get(12)?,
                insignia: row.get(13)?,
                font: row.get(14)?,
                impact: row.get(15)?,
            })
        };

        Ok(NoteAndRef {
            note: Note {
                id: row.get(0)?,
                prev_note_id: row.get(1)?,
                kind: row.get(2)?,
                content: row.get(3)?,
                point_id: row.get(4)?,
                font: row.get(5)?,
                refs: vec![],
                flashcards: vec![],
            },
            reference_maybe,
        })
    }
}

impl FromRow for NoteAndRefAndDeck {
    fn from_row(row: &Row) -> rusqlite::Result<NoteAndRefAndDeck> {
        let mut reference_maybe: Option<Ref> = None;
        let reference_deck_id: Option<Key> = row.get(8)?;
        if let Some(ref_deck_id) = reference_deck_id {
            reference_maybe = Some(Ref {
                note_id: row.get(0)?,
                ref_kind: row.get(6)?,
                annotation: row.get(7)?,

                id: ref_deck_id,
                title: row.get(9)?,
                deck_kind: row.get(10)?,
                created_at: row.get(11)?,
                graph_terminator: row.get(12)?,
                insignia: row.get(13)?,
                font: row.get(14)?,
                impact: row.get(15)?,
            })
        };

        Ok(NoteAndRefAndDeck {
            note: Note {
                id: row.get(0)?,
                prev_note_id: row.get(1)?,
                kind: row.get(2)?,
                content: row.get(3)?,
                point_id: row.get(4)?,
                font: row.get(5)?,
                refs: vec![],
                flashcards: vec![],
            },
            reference_maybe,
            deck: SlimDeck {
                id: row.get(16)?,
                title: row.get(17)?,
                deck_kind: row.get(18)?,
                created_at: row.get(19)?,
                graph_terminator: row.get(20)?,
                insignia: row.get(21)?,
                font: row.get(22)?,
                impact: row.get(23)?,
            },
        })
    }
}

// get all notes that are children of the given deck
//
pub(crate) fn notes_for_deck(
    conn: &rusqlite::Connection,
    deck_id: Key,
) -> Result<Vec<Note>, DbError> {
    let stmt = "SELECT   n.id,
                         n.prev_note_id,
                         n.kind,
                         n.content,
                         n.point_id,
                         n.font,
                         r.kind as ref_kind,
                         r.annotation,
                         d.id,
                         d.name,
                         d.kind as deck_kind,
                         d.created_at,
                         d.graph_terminator,
                         d.insignia,
                         d.font,
                         d.impact
                FROM     notes n
                         FULL JOIN refs r on r.note_id = n.id
                         FULL JOIN decks d on r.deck_id = d.id
                WHERE    n.deck_id = ?1
                ORDER BY n.id";
    let notes_and_refs: Vec<NoteAndRef> = sqlite::many(&conn, stmt, params!(&deck_id))?;

    let mut notes = notes_from_notes_and_refs(notes_and_refs)?;

    let flashcards = memorise_db::all_flashcards_for_deck(conn, deck_id)?;

    assign_flashcards_to_notes(&mut notes, &flashcards)?;

    Ok(notes)
}

fn copy_flashcard(flashcard: &FlashCard) -> FlashCard {
    FlashCard {
        id: flashcard.id,

        note_id: flashcard.note_id,
        prompt: String::from(&flashcard.prompt),
        next_test_date: flashcard.next_test_date,

        easiness_factor: flashcard.easiness_factor,
        interval: flashcard.interval,
        repetition: flashcard.repetition,
    }
}

pub(crate) fn assign_flashcards_to_notes(
    notes: &mut [Note],
    flashcards: &Vec<FlashCard>,
) -> Result<(), DbError> {
    for flashcard in flashcards {
        if let Some(index) = notes.iter().position(|n| n.id == flashcard.note_id) {
            notes[index].flashcards.push(copy_flashcard(flashcard));
        }
    }

    Ok(())
}

fn notes_from_notes_and_refs(notes_and_refs: Vec<NoteAndRef>) -> Result<Vec<Note>, DbError> {
    let mut res: Vec<Note> = vec![];

    for note_and_ref in notes_and_refs {
        // only check the last element in the vector since the rows have been ordered by note id
        //
        if res.is_empty() || res[res.len() - 1].id != note_and_ref.note.id {
            res.push(Note {
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

pub(crate) fn arrivals_for_deck(
    conn: &rusqlite::Connection,
    deck_id: Key,
) -> Result<Vec<Arrival>, DbError> {
    let stmt = "SELECT   n.id,
                         n.prev_note_id,
                         n.kind,
                         n.content,
                         n.point_id,
                         n.font,
                         r2.kind as ref_kind,
                         r2.annotation,
                         d3.id,
                         d3.name,
                         d3.kind as deck_kind,
                         d3.created_at,
                         d3.graph_terminator,
                         d3.insignia,
                         d3.font,
                         d3.impact,
                         owner_deck.id,
                         owner_deck.name,
                         owner_deck.kind as deck_kind,
                         owner_deck.created_at,
                         owner_deck.graph_terminator,
                         owner_deck.insignia,
                         owner_deck.font,
                         owner_deck.impact
                FROM     refs r
                         FULL JOIN notes n on r.note_id = n.id
                         FULL JOIN decks owner_deck on n.deck_id = owner_deck.id
                         FULL JOIN refs r2 on r2.note_id = n.id
                         FULL JOIN decks d3 on r2.deck_id = d3.id
                WHERE    r.deck_id = ?1
                ORDER BY owner_deck.id, n.id";
    let notes_and_refs_and_decks: Vec<NoteAndRefAndDeck> =
        sqlite::many(&conn, stmt, params!(&deck_id))?;

    let mut arrivals = arrivals_from_notes_and_refs_and_decks(notes_and_refs_and_decks)?;

    let flashcards = memorise_db::all_flashcards_for_deck_arrivals_conn(conn, deck_id)?;

    assign_flashcards_to_arrivals(&mut arrivals, flashcards)?;

    Ok(arrivals)
}

fn assign_flashcards_to_arrivals(
    arrivals: &mut [Arrival],
    flashcards: Vec<FlashCard>,
) -> Result<(), DbError> {
    for flashcard in flashcards {
        for arrival in &mut *arrivals {
            if let Some(index) = arrival.notes.iter().position(|n| n.id == flashcard.note_id) {
                arrival.notes[index].flashcards.push(flashcard);
                break;
            }
        }
    }

    Ok(())
}

fn arrivals_from_notes_and_refs_and_decks(
    notes_and_refs_and_decks: Vec<NoteAndRefAndDeck>,
) -> Result<Vec<Arrival>, DbError> {
    let mut res: Vec<Arrival> = vec![];

    for note_and_ref_and_deck in notes_and_refs_and_decks {
        // only check the last element in the vector since the rows have been ordered by note id
        //
        if res.is_empty() || res[res.len() - 1].deck.id != note_and_ref_and_deck.deck.id {
            res.push(Arrival {
                notes: vec![],
                deck: note_and_ref_and_deck.deck,
            });
        }

        let idx = res.len() - 1;
        let notes = &mut res[idx].notes;
        if notes.is_empty() || notes[notes.len() - 1].id != note_and_ref_and_deck.note.id {
            notes.push(Note {
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

fn delete_note_properly_conn(
    conn: &mut rusqlite::Connection,
    user_id: Key,
    note_id: Key,
) -> Result<Vec<Note>, DbError> {
    let tx = conn.transaction()?;

    let stmt = "SELECT deck_id
                FROM notes
                WHERE id = ?1";
    let deck_id: Key = sqlite::one(&tx, stmt, params![&note_id])?;

    // point the next note to the previous note
    let stmt = "SELECT id
                FROM notes
                WHERE prev_note_id = ?1";
    let next_ids: Vec<Key> = sqlite::many(&tx, stmt, params![&note_id])?;
    if next_ids.len() == 1 {
        let next_id = next_ids[0];

        // correctly set the next note's prev_note_id
        let stmt = "SELECT prev_note_id
                    FROM notes
                    WHERE id = ?1 AND user_id = ?2";
        let prev_note_id: Option<Key> = sqlite::one(&tx, stmt, params![&note_id, &user_id])?;

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
                FROM refs
                WHERE note_id = ?1";
    sqlite::zero(&tx, stmt, params![&note_id])?;

    let stmt = "DELETE
                FROM notes
                WHERE id = ?1 AND user_id = ?2";
    sqlite::zero(&tx, stmt, params![&note_id, &user_id])?;

    tx.commit()?;

    // return all the notes that the parent deck has
    notes_for_deck(conn, deck_id)
}

pub(crate) async fn delete_note_properly(
    sqlite_pool: &SqlitePool,
    user_id: Key,
    note_id: Key,
) -> crate::Result<Vec<Note>> {
    db(sqlite_pool, move |conn| {
        delete_note_properly_conn(conn, user_id, note_id)
    })
    .await
    .map_err(Into::into)
}

pub(crate) fn create_common(
    conn: &Connection,
    user_id: Key,
    deck_id: Key,
    font: Font,
    kind: NoteKind,
    point_id: Option<Key>,
    content: &str,
    prev_note_id: Option<Key>,
    next_note_id: Option<Key>,
) -> Result<Note, DbError> {
    let stmt = "INSERT INTO notes(user_id, deck_id, font, kind, point_id, content, prev_note_id)
                VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)
                RETURNING id, content, kind, point_id, prev_note_id, font";
    let note: Note = sqlite::one(
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
) -> Result<Note, DbError> {
    create_common(
        tx,
        user_id,
        deck_id,
        Font::Serif,
        NoteKind::NoteDeckMeta,
        None,
        "",
        None,
        None,
    )
}

fn create_notes_conn(
    conn: &mut rusqlite::Connection,
    user_id: Key,
    note: ProtoNote,
) -> Result<Vec<Note>, DbError> {
    // let mut notes: Vec<Note> = Vec::new();
    let tx = conn.transaction()?;

    let mut new_prev = note.prev_note_id;
    let next_note_id = note.next_note_id;

    if let Some(next_note_id) = next_note_id {
        // when the ProtoNote has a Some(next_note_id) then it can have a None for prev_note_id,
        // it's upto this code to get the correct prev_note_id
        new_prev = get_prev_note_id(&tx, next_note_id)?;
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

    let all_notes = notes_for_deck(conn, note.deck_id)?;
    Ok(all_notes)
}

pub(crate) async fn create_notes(
    sqlite_pool: &SqlitePool,
    user_id: Key,
    note: ProtoNote,
) -> crate::Result<Vec<Note>> {
    db(sqlite_pool, move |conn| {
        create_notes_conn(conn, user_id, note)
    })
    .await
    .map_err(Into::into)
}

fn update_prev_note_id(conn: &Connection, note_id: Key, prev_note_id: Key) -> Result<(), DbError> {
    let stmt = "UPDATE notes
                SET prev_note_id = ?2
                WHERE id = ?1";
    sqlite::zero(conn, stmt, params![&note_id, &prev_note_id])
}

fn clear_prev_note_id(conn: &Connection, note_id: Key) -> Result<(), DbError> {
    let stmt = "UPDATE notes
                SET prev_note_id = null
                WHERE id = ?1";
    sqlite::zero(conn, stmt, params![&note_id])
}

fn preview_conn(
    conn: &rusqlite::Connection,
    user_id: Key,
    deck_id: Key,
) -> Result<PreviewNotes, DbError> {
    let stmt = "SELECT n.id,
                       n.content,
                       n.kind,
                       n.point_id,
                       n.prev_note_id,
                       n.font
                FROM notes n
                WHERE n.point_id is null AND n.deck_id = ?1 AND n.user_id = ?2";
    let notes = sqlite::many(&conn, stmt, params![&deck_id, &user_id])?;

    Ok(PreviewNotes { deck_id, notes })
}

pub(crate) async fn preview(
    sqlite_pool: &SqlitePool,
    user_id: Key,
    deck_id: Key,
) -> crate::Result<PreviewNotes> {
    db(sqlite_pool, move |conn| {
        preview_conn(conn, user_id, deck_id)
    })
    .await
    .map_err(Into::into)
}

fn add_auto_summary_conn(
    conn: &rusqlite::Connection,
    user_id: Key,
    deck_id: Key,
    prev_id: Option<Key>,
    summary: String,
) -> Result<Note, DbError> {
    create_common(
        &conn,
        user_id,
        deck_id,
        Font::AI,
        NoteKind::NoteSummary,
        None,
        &summary,
        prev_id,
        None,
    )
}

pub(crate) async fn add_auto_summary(
    sqlite_pool: &SqlitePool,
    user_id: Key,
    deck_id: Key,
    prev_id: Option<Key>,
    summary: String,
) -> crate::Result<Note> {
    db(sqlite_pool, move |conn| {
        add_auto_summary_conn(conn, user_id, deck_id, prev_id, summary)
    })
    .await
    .map_err(Into::into)
}

// isg todo: this won't get the note's refs, so maybe use two queries: one to edit another to return the full note
//
fn edit_note_conn(
    conn: &rusqlite::Connection,
    user_id: Key,
    note: Note,
    note_id: Key,
) -> Result<Note, DbError> {
    let stmt = "UPDATE notes
                SET content = ?3, font= ?4
                WHERE id = ?2 AND user_id = ?1";
    sqlite::zero(
        &conn,
        stmt,
        params![&user_id, &note_id, &note.content, &i32::from(note.font)],
    )?;

    let stmt = "SELECT   n.id,
                         n.prev_note_id,
                         n.kind,
                         n.content,
                         n.point_id,
                         n.font,
                         r.kind as ref_kind,
                         r.annotation,
                         d.id,
                         d.name,
                         d.kind as deck_kind,
                         d.created_at,
                         d.graph_terminator,
                         d.insignia,
                         d.font,
                         d.impact
                FROM     notes n
                         FULL JOIN refs r on r.note_id = n.id
                         FULL JOIN decks d on r.deck_id = d.id
                WHERE    n.id = ?1";
    let notes_and_refs: Vec<NoteAndRef> = sqlite::many(&conn, stmt, params!(&note_id))?;

    let mut notes = notes_from_notes_and_refs(notes_and_refs)?;
    let flashcards = memorise_db::all_flashcards_for_note(conn, note_id)?;
    assign_flashcards_to_notes(&mut notes, &flashcards)?;

    if notes.len() == 1 {
        Ok(notes[0].clone())
    } else {
        Err(DbError::TooManyFound)
    }
}

pub(crate) async fn edit_note(
    sqlite_pool: &SqlitePool,
    user_id: Key,
    note: Note,
    note_id: Key,
) -> crate::Result<Note> {
    db(sqlite_pool, move |conn| {
        edit_note_conn(conn, user_id, note, note_id)
    })
    .await
    .map_err(Into::into)
}

pub fn get_all_notes_in_db(sqlite_pool: &SqlitePool) -> crate::Result<Vec<Note>> {
    let conn = sqlite_pool.get()?;
    let stmt = "SELECT n.id,
                       n.content,
                       n.kind,
                       n.point_id,
                       n.prev_note_id,
                       n.font
                FROM   notes n
                ORDER BY n.id";
    sqlite::many(&conn, stmt, &[]).map_err(Into::into)
}

fn get_prev_note_id(conn: &rusqlite::Connection, id: Key) -> Result<Option<Key>, DbError> {
    let stmt = "SELECT prev_note_id
                FROM   notes
                WHERE  id=?1";
    sqlite::one(&conn, stmt, &[&id])
}

pub(crate) fn replace_note_fonts_conn(
    conn: &Connection,
    user_id: Key,
    deck_id: Key,
    original_font: Font,
    new_font: Font,
) -> Result<(), DbError> {
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

pub(crate) fn overwrite_note_fonts_conn(
    conn: &Connection,
    user_id: Key,
    deck_id: Key,
    new_font: Font,
) -> Result<(), DbError> {
    let stmt = "UPDATE notes
                SET font = ?3
                WHERE user_id = ?1 AND deck_id = ?2 AND font <> ?3";

    sqlite::zero(
        conn,
        stmt,
        params![&user_id, &deck_id, &i32::from(new_font)],
    )
}
