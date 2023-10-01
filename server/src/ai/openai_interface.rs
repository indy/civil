// Copyright (C) 2023 Inderjit Gill <email@indy.io>

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

use crate::error::Error;
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
    Function,
}

impl fmt::Display for Role {
    fn fmt(&self, f: &mut fmt::Formatter) -> fmt::Result {
        match self {
            Role::System => write!(f, "system"),
            Role::Assistant => write!(f, "assistant"),
            Role::User => write!(f, "user"),
            Role::Function => write!(f, "function"),
        }
    }
}

impl FromStr for Role {
    type Err = Error;

    fn from_str(input: &str) -> crate::Result<Role> {
        match input {
            "system" => Ok(Role::System),
            "assistant" => Ok(Role::Assistant),
            "user" => Ok(Role::User),
            "function" => Ok(Role::Function),
            _ => Err(Error::StringConversionToEnum),
        }
    }
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
pub struct ChatMessage {
    pub note_id: Key,
    pub role: Role,
    pub content: String,
}

#[derive(Debug, serde::Deserialize, serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct MessageChoice {
    /// The actual message
    pub message: chatgpt::types::ChatMessage,
    /// The reason completion was stopped
    pub finish_reason: String,
    /// The index of this message in the outer `message_choices` array
    pub index: u32,
}

impl From<chatgpt::types::MessageChoice> for MessageChoice {
    fn from(mc: chatgpt::types::MessageChoice) -> MessageChoice {
        MessageChoice {
            message: mc.message,
            finish_reason: mc.finish_reason,
            index: mc.index,
        }
    }
}

impl From<Role> for chatgpt::types::Role {
    fn from(r: Role) -> chatgpt::types::Role {
        match r {
            Role::System => chatgpt::types::Role::System,
            Role::Assistant => chatgpt::types::Role::Assistant,
            Role::User => chatgpt::types::Role::User,
            Role::Function => chatgpt::types::Role::Function,
        }
    }
}

impl From<chatgpt::types::Role> for Role {
    fn from(r: chatgpt::types::Role) -> Role {
        match r {
            chatgpt::types::Role::System => Role::System,
            chatgpt::types::Role::Assistant => Role::Assistant,
            chatgpt::types::Role::User => Role::User,
            chatgpt::types::Role::Function => Role::Function,
        }
    }
}

impl From<ChatMessage> for chatgpt::types::ChatMessage {
    fn from(dcm: ChatMessage) -> chatgpt::types::ChatMessage {
        chatgpt::types::ChatMessage {
            role: dcm.role.into(),
            content: dcm.content,
        }
    }
}
