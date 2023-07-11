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

use crate::error::{Error, Result};

use crate::interop::decks::{BackNote, Ref};
use crate::interop::memorise::FlashCard;
use crate::interop::notes::Note;
use crate::interop::Key;

use std::fmt;
use std::str::FromStr;

#[derive(
    Copy, Clone, Debug, PartialEq, Eq, serde_repr::Serialize_repr, serde_repr::Deserialize_repr,
)]
#[repr(u8)]
pub enum Role {
    System = 1,
    Assistant,
    User,
}

impl fmt::Display for Role {
    fn fmt(&self, f: &mut fmt::Formatter) -> fmt::Result {
        match self {
            Role::System => write!(f, "system"),
            Role::Assistant => write!(f, "assistant"),
            Role::User => write!(f, "user"),
        }
    }
}

impl FromStr for Role {
    type Err = Error;

    fn from_str(input: &str) -> Result<Role> {
        match input {
            "system" => Ok(Role::System),
            "assistant" => Ok(Role::Assistant),
            "user" => Ok(Role::User),
            _ => Err(Error::StringConversionToEnum),
        }
    }
}

#[derive(Debug, serde::Deserialize, serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ChatMessage {
    pub role: Role,
    pub content: String,
}

#[derive(Debug, serde::Deserialize, serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct AppendChatMessage {
    pub prev_note_id: Option<Key>,
    pub role: Role,
    pub content: String,
}

#[derive(Debug, serde::Deserialize, serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct OriginalChatMessage {
    pub note_id: Key,
    pub role: Role,
    pub content: String,
}

#[derive(Debug, serde::Deserialize, serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Dialogue {
    pub id: Key,
    pub title: String,
    pub kind: String,

    pub insignia: i32,

    pub created_at: chrono::NaiveDateTime,

    pub notes: Option<Vec<Note>>,

    pub refs: Option<Vec<Ref>>,

    pub backnotes: Option<Vec<BackNote>>,
    pub backrefs: Option<Vec<Ref>>,

    pub flashcards: Option<Vec<FlashCard>>,

    pub original_chat_messages: Vec<OriginalChatMessage>,
}

#[derive(Debug, serde::Deserialize, serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ProtoChat {
    pub messages: Vec<ChatMessage>,
}

#[derive(Debug, serde::Deserialize, serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ProtoDialogue {
    pub title: String,
    pub kind: String,
    pub insignia: i32,
    pub messages: Vec<ChatMessage>,
}
