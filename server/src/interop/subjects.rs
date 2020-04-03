// Copyright (C) 2020 Inderjit Gill <email@indy.io>

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

use crate::interop::decks::DeckMention;
use crate::interop::edges::MarginConnection;
use crate::interop::notes::Note;
use crate::interop::Key;

#[derive(Debug, serde::Deserialize, serde::Serialize)]
pub struct Subject {
    pub id: Key,
    pub name: String,

    pub notes: Option<Vec<Note>>,
    pub quotes: Option<Vec<Note>>,

    pub tags_in_notes: Option<Vec<MarginConnection>>,
    pub decks_in_notes: Option<Vec<MarginConnection>>,

    pub mentioned_by_people: Option<Vec<DeckMention>>,
    pub mentioned_in_subjects: Option<Vec<DeckMention>>,
    pub mentioned_in_articles: Option<Vec<DeckMention>>,
}

#[derive(Debug, serde::Deserialize, serde::Serialize)]
pub struct CreateSubject {
    pub name: String,
}
