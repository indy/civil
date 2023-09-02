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

use crate::ai::openai_interface;
use crate::error::Error;
use crate::interop::decks::{Arrival, DeckKind};
use crate::interop::font::Font;
use crate::interop::memorise::FlashCard;
use crate::interop::notes::Note;
use crate::interop::Key;

use std::fmt;
use std::str::FromStr;

#[derive(
    Copy, Clone, Debug, PartialEq, Eq, serde_repr::Serialize_repr, serde_repr::Deserialize_repr,
)]
#[repr(u8)]
pub enum AiKind {
    OpenAIGpt35Turbo = 1,
    OpenAIGpt4,
}

impl fmt::Display for AiKind {
    fn fmt(&self, f: &mut fmt::Formatter) -> fmt::Result {
        match self {
            AiKind::OpenAIGpt35Turbo => write!(f, "OpenAI::Gpt35Turbo"),
            AiKind::OpenAIGpt4 => write!(f, "OpenAI::Gpt4"),
        }
    }
}

impl FromStr for AiKind {
    type Err = Error;

    fn from_str(input: &str) -> crate::Result<AiKind> {
        match input {
            "OpenAI::Gpt35Turbo" => Ok(AiKind::OpenAIGpt35Turbo),
            "OpenAI::Gpt4" => Ok(AiKind::OpenAIGpt4),
            _ => Err(Error::StringConversionToEnum),
        }
    }
}

#[derive(Debug, serde::Deserialize, serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Dialogue {
    pub id: Key,
    pub title: String,

    pub deck_kind: DeckKind,

    pub insignia: i32,
    pub font: Font,

    pub created_at: chrono::NaiveDateTime,

    pub notes: Vec<Note>,
    pub arrivals: Vec<Arrival>,

    pub flashcards: Vec<FlashCard>,

    pub ai_kind: AiKind,
    pub original_chat_messages: Vec<openai_interface::ChatMessage>,
}

#[derive(Debug, serde::Deserialize, serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ProtoChat {
    pub ai_kind: AiKind,
    pub messages: Vec<openai_interface::ChatMessage>,
}

#[derive(Debug, serde::Deserialize, serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ProtoDialogue {
    pub title: String,

    pub insignia: i32,
    pub font: Font,
    pub graph_terminator: bool,

    pub ai_kind: AiKind,
    pub messages: Vec<openai_interface::ChatMessage>,
}
