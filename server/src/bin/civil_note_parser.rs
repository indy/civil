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
use civil_server::{note_parser_api, Result};
use civil_shared;

use tracing::info;

#[actix_rt::main]
async fn main() -> Result<()> {
    civil_server::init_dotenv();
    civil_server::init_tracing();
    let pool = civil_server::init_postgres_pool().await?;

    info!("started parsing all note markup");
    let notes = note_parser_api::get_all_notes_in_db(&pool).await?;

    let mut num_elements: usize = 0;

    for note in notes {
        let res = civil_shared::markup_as_struct(&note.content)?;
        num_elements += res.len();
    }
    info!("finished parsing all note markup {}", num_elements);

    Ok(())
}
