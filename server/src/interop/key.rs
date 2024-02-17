// Copyright (C) 2024 Inderjit Gill <email@indy.io>

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

#[derive(Debug, Copy, Clone, serde::Deserialize, serde::Serialize, Eq, PartialEq, PartialOrd)]
pub struct Key(pub i64);

use std::fmt;
impl fmt::Display for Key {
    fn fmt(&self, f: &mut fmt::Formatter) -> fmt::Result {
        write!(f, "{}", self.0)
    }
}

use std::hash::{Hash, Hasher};
impl Hash for Key {
    fn hash<H: Hasher>(&self, hasher: &mut H) {
        // Hash the internal value of the Key structure
        self.0.hash(hasher);
    }
}

use std::str::FromStr;
impl FromStr for Key {
    type Err = std::num::ParseIntError;

    fn from_str(s: &str) -> Result<Self, Self::Err> {
        // Attempt to parse the string as an i64
        let parsed_value = s.parse::<i64>()?;

        // Create a new Key instance with the parsed value
        Ok(Key(parsed_value))
    }
}

use rusqlite::types::{FromSql, FromSqlResult, ValueRef};
impl FromSql for Key {
    fn column_result(value: ValueRef<'_>) -> FromSqlResult<Self> {
        let i = value.as_i64()?;
        Ok(Key(i))
    }
}

use rusqlite::types::{ToSql, ToSqlOutput};
impl ToSql for Key {
    fn to_sql(&self) -> rusqlite::Result<ToSqlOutput> {
        Ok(ToSqlOutput::from(self.0))
    }
}
