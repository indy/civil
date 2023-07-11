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

pub mod openai;

use crate::error::Result;
use chatgpt::prelude::*;

#[derive(Debug, Clone)]
pub struct AI {
    pub chatgpt_client: ChatGPT,
}

impl AI {
    pub fn new(openai_key: String) -> Result<Self> {
        // Creating a new ChatGPT client.
        let chatgpt_config = chatgpt::config::ModelConfiguration {
            engine: ChatGPTEngine::Gpt35Turbo,
            ..Default::default()
        };
        let chatgpt_client = ChatGPT::new_with_config(openai_key, chatgpt_config)?;

        Ok(Self { chatgpt_client })
    }
}
