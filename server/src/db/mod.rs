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

pub mod articles;
pub mod bookmarks;
pub mod concepts;
pub mod decks;
pub mod dialogues;
pub mod events;
pub mod graph;
pub mod ideas;
pub mod memorise;
pub mod notes;
pub mod people;
pub mod points;
pub mod quotes;
pub mod references;
pub mod search;
pub mod stats;
pub mod timelines;
pub mod uploader;
pub mod users;

pub mod sqlite;
pub mod sqlite_migrations;

fn sanitize_for_sqlite_match(s: String) -> crate::Result<String> {
    let res: String = s
        .chars()
        .map(|x| match x {
            '?' => ' ',
            '>' => ' ',
            '<' => ' ',
            '+' => ' ',
            '-' => ' ',
            '/' => ' ',
            '*' => ' ',
            '%' => ' ',
            '!' => ' ',
            '(' => ' ',
            ')' => ' ',
            ',' => ' ',
            '.' => ' ',
            ':' => ' ',
            '&' => ' ',
            '`' => ' ',
            '\\' => ' ',
            '\'' => ' ',
            _ => x,
        })
        .collect();

    Ok(res)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_postfix_asterisks() {
        assert_eq!(postfix_asterisks("hello foo").unwrap(), "hello* foo* ");
    }
}
