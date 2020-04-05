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

use crate::interop::dates::{CreateDate, Date};
use crate::interop::edges::{LinkBack, MarginConnection};
use crate::interop::locations::{CreateLocation, Location};
use crate::interop::notes::Note;
use crate::interop::Key;

#[derive(Debug, serde::Deserialize, serde::Serialize)]
pub struct Person {
    pub id: Key,
    pub name: String,
    pub birth_date: Option<Date>, // todo: birth date and location should not be options
    pub birth_location: Option<Location>,
    pub death_date: Option<Date>,
    pub death_location: Option<Location>,

    pub notes: Option<Vec<Note>>,

    pub tags_in_notes: Option<Vec<MarginConnection>>,
    pub decks_in_notes: Option<Vec<MarginConnection>>,

    pub linkbacks_to_decks: Option<Vec<LinkBack>>,
    pub linkbacks_to_ideas: Option<Vec<LinkBack>>,
    pub linkbacks_to_tags: Option<Vec<LinkBack>>,
}

#[derive(Debug, serde::Deserialize, serde::Serialize)]
pub struct CreatePerson {
    pub name: String,
    // todo: there should be an age parameter here?
    pub birth_date: CreateDate,
    pub birth_location: CreateLocation,
    pub death_date: Option<CreateDate>,
    pub death_location: Option<CreateLocation>,
}
