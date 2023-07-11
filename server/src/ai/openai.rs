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

use crate::error::{Error, Result};
use crate::interop::dialogues as interop;

use chatgpt::prelude::*;

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

impl From<interop::Role> for chatgpt::types::Role {
    fn from(r: interop::Role) -> chatgpt::types::Role {
        match r {
            interop::Role::System => chatgpt::types::Role::System,
            interop::Role::Assistant => chatgpt::types::Role::Assistant,
            interop::Role::User => chatgpt::types::Role::User,
        }
    }
}

impl From<chatgpt::types::Role> for interop::Role {
    fn from(r: chatgpt::types::Role) -> interop::Role {
        match r {
            chatgpt::types::Role::System => interop::Role::System,
            chatgpt::types::Role::Assistant => interop::Role::Assistant,
            chatgpt::types::Role::User => interop::Role::User,
        }
    }
}

impl From<interop::ChatMessage> for chatgpt::types::ChatMessage {
    fn from(dcm: interop::ChatMessage) -> chatgpt::types::ChatMessage {
        chatgpt::types::ChatMessage {
            role: dcm.role.into(),
            content: dcm.content,
        }
    }
}

pub(crate) async fn chat(
    chatgpt: &ChatGPT,
    messages: Vec<interop::ChatMessage>,
) -> Result<Vec<MessageChoice>> {
    let mut history: Vec<chatgpt::types::ChatMessage> = vec![];
    // todo: can into be called on a vec of objects?
    for m in messages {
        history.push(m.into());
    }

    // let r = chatgpt.send_history(&history).await?;

    match chatgpt.send_history(&history).await {
        Ok(r) => {
            let mut response: Vec<MessageChoice> = vec![];
            for message_choice in r.message_choices {
                response.push(MessageChoice::from(message_choice));
            }

            Ok(response)
        }
        Err(e) => {
            dbg!(&e);
            Err(Error::ChatGPTError(e))
        }
    }
}
