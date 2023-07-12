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

pub mod openai_interface;

use crate::error::Error;
use chatgpt::prelude::*;

#[derive(Debug, Clone)]
pub struct AI {
    pub chatgpt_client: ChatGPT,
}

impl AI {
    pub fn new(openai_key: String) -> crate::Result<Self> {
        // Creating a new ChatGPT client.
        let chatgpt_config = chatgpt::config::ModelConfiguration {
            engine: ChatGPTEngine::Gpt35Turbo,
            ..Default::default()
        };
        let chatgpt_client = ChatGPT::new_with_config(openai_key, chatgpt_config)?;

        Ok(Self { chatgpt_client })
    }

    // chat_gpt
    //
    pub async fn chat(
        &self,
        messages: Vec<openai_interface::ChatMessage>,
    ) -> crate::Result<Vec<openai_interface::MessageChoice>> {
        let history: Vec<chatgpt::types::ChatMessage> =
            messages.into_iter().map(From::from).collect();

        match self.chatgpt_client.send_history(&history).await {
            Ok(r) => {
                let response = r
                    .message_choices
                    .into_iter()
                    .map(openai_interface::MessageChoice::from)
                    .collect();
                Ok(response)
            }
            Err(e) => {
                dbg!(&e);
                Err(Error::ChatGPTError(e))
            }
        }
    }
}
