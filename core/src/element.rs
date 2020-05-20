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

use serde_derive::Serialize;

#[derive(Default, Serialize)]
pub struct Element {
    pub name: String,
    pub key: Option<usize>,
    pub class_name: Option<String>,

    pub html_for: Option<String>,
    pub href: Option<String>,
    pub html_type: Option<String>,
    pub id: Option<String>,

    pub children: Vec<Element>,
    pub text: Option<String>
}
