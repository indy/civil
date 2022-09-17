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

use civil_server;
use civil_server::{note_linked_list_api, Result};
use civil_server::interop::Key;
use civil_server::interop::notes::NoteKind;
use civil_server::db::sqlite::SqlitePool;

use rusqlite::Connection;
use tracing::info;

use r2d2_sqlite::SqliteConnectionManager;

#[actix_rt::main]
async fn main() -> Result<()> {
    civil_server::init_dotenv();
    civil_server::init_tracing();

    let sqlite_db = civil_server::env_var_string("SQLITE_DB")?;
    civil_server::db::sqlite_migrations::migration_check(&sqlite_db)?;

    let sqlite_manager = SqliteConnectionManager::file(&sqlite_db);
    let sqlite_pool = r2d2::Pool::new(sqlite_manager)?;

    // process_deck(&sqlite_pool, 769)?;
    // process_deck(&sqlite_pool, 100)?;

    info!("started filling in next_note_ids");
    let deck_ids = note_linked_list_api::get_all_deck_ids_in_db(&sqlite_pool)?;

    let mut num_decks: usize = 0;

    for deck_id in deck_ids {

        process_deck(&sqlite_pool, deck_id)?;

        num_decks += 1;

        if num_decks % 100 == 0 {
            info!("count: {}", num_decks);
        }
    }
    info!("finished processing all decks {}", num_decks);

    Ok(())
}

#[derive(Debug)]
struct PointListInfo {
    pub point_id: Key,
    pub note_ids: Vec<Key>,
}

impl PointListInfo {
    fn new(point_id: Key, first_note_id: Key) -> PointListInfo {
        PointListInfo {
            point_id,
            note_ids: vec![first_note_id]
        }
    }
}

#[derive(Debug)]
struct DeckListInfo {
    pub points: Vec<PointListInfo>,
    pub note_kind_note: Vec<Key>,
    pub note_kind_review: Vec<Key>,
    pub note_kind_summary: Vec<Key>,
    pub note_kind_deckmeta: Vec<Key>,
}

impl DeckListInfo {
    fn new() -> DeckListInfo {
        DeckListInfo {
            points: Vec::new(),
            note_kind_note: Vec::new(),
            note_kind_review: Vec::new(),
            note_kind_summary: Vec::new(),
            note_kind_deckmeta: Vec::new(),
        }
    }
}

fn process_deck(sqlite_pool: &SqlitePool, deck_id: Key) -> Result<()> {
    let mut dli = DeckListInfo::new();

    let notes = note_linked_list_api::get_all_note2_for_deck_id(&sqlite_pool, deck_id)?;

    for note in notes {
        if let Some(point_id) = note.point_id {
            let mut found = false;

            // search existing point_ids
            for pli in &mut dli.points {
                if pli.point_id == point_id {
                    found = true;
                    pli.note_ids.push(note.id);
                    break;
                }
            }

            // create a new pli
            if !found {
                dli.points.push(PointListInfo::new(point_id, note.id));
            }

        } else {
            match note.kind {
                NoteKind::Note => {
                    dli.note_kind_note.push(note.id);
                },
                NoteKind::NoteReview => {
                    dli.note_kind_review.push(note.id);
                },
                NoteKind::NoteSummary => {
                    dli.note_kind_summary.push(note.id);
                },
                NoteKind::NoteDeckMeta => {
                    dli.note_kind_deckmeta.push(note.id);
                },
            }
        }
    }

    update_next_note_ids(sqlite_pool, dli)?;

    Ok(())
}

fn update_next_note_ids(sqlite_pool: &SqlitePool, dli: DeckListInfo) -> Result<()> {
    let conn = sqlite_pool.get()?;

    for p in dli.points {
        iterate_list(&conn, p.note_ids)?;
    }
    iterate_list(&conn, dli.note_kind_note)?;
    iterate_list(&conn, dli.note_kind_review)?;
    iterate_list(&conn, dli.note_kind_summary)?;
    iterate_list(&conn, dli.note_kind_deckmeta)?;

    Ok(())
}

fn iterate_list(conn: &Connection, ls: Vec<Key>) -> Result<()> {
    let len = ls.len();
    for (pos, k) in ls.iter().enumerate() {
        if pos < len - 1 {
            note_linked_list_api::write_next_note_id(&conn, *k, ls[pos+1])?;
        }
    }

    Ok(())
}
