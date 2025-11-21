// Copyright (C) 2025 Inderjit Gill <email@indy.io>

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

use std::ops::Deref;

const SELECT_DECKLIKE: &str = "SELECT d.id as id, d.name as name, d.kind as kind, d.created_at as created_at,
                               d.graph_terminator as graph_terminator, d.insignia as insignia, d.font as font,
                               d.impact as impact ";

pub(crate) struct Qry {
    s: String,
}

impl Deref for Qry {
    type Target = str;

    fn deref(&self) -> &Self::Target {
        &self.s
    }
}

impl Qry {
    pub fn new(base: &str) -> Self {
        Self { s: base.to_owned() }
    }

    // no need for build at the moment since all functions use the Deref trait above to convert into a str
    //
    // pub fn build(self) -> String {
    //     self.s
    // }

    pub fn select(part: &str) -> Self {
        let res = Self {
            s: "SELECT ".to_owned(),
        };
        res.add(part)
    }

    pub fn select_count() -> Self {
        Self {
            s: "SELECT count(*) ".to_owned(),
        }
    }

    pub fn select_decklike() -> Self {
        Self {
            s: SELECT_DECKLIKE.to_owned(),
        }
    }

    pub fn select_decklike_inline(self) -> Self {
        self.add(SELECT_DECKLIKE)
    }

    pub fn comma(self, part: &str) -> Self {
        self.prefix_add(", ", part)
    }

    pub fn from(self, part: &str) -> Self {
        self.prefix_add(" FROM ", part)
    }

    pub fn from_decklike(self) -> Self {
        self.add(" FROM decks d ")
    }

    pub fn from_nested(self, part: &str) -> Self {
        self.prefix_add_bracketed(" FROM ", part)
    }

    pub fn join(self, part: &str) -> Self {
        self.prefix_add(" JOIN ", part)
    }

    pub fn left_join(self, part: &str) -> Self {
        self.prefix_add(" LEFT JOIN ", part)
    }

    pub fn full_join(self, part: &str) -> Self {
        self.prefix_add(" FULL JOIN ", part)
    }

    pub fn inner_join(self, part: &str) -> Self {
        self.prefix_add(" INNER JOIN ", part)
    }

    pub fn where_clause(self, part: &str) -> Self {
        // 'where' is a reserved word in Rust
        self.prefix_add(" WHERE ", part)
    }

    pub fn where_decklike(self) -> Self {
        self.add(" WHERE d.user_id = :user_id and d.kind = :deck_kind and d.id = :deck_id ")
    }

    pub fn where_decklike_but_no_deck_id(self) -> Self {
        self.add(" WHERE d.user_id = :user_id and d.kind = :deck_kind ")
    }

    pub fn and(self, part: &str) -> Self {
        self.prefix_add(" AND ", part)
    }

    pub fn union(self) -> Self {
        self.add(" UNION ")
    }

    pub fn group_by(self, part: &str) -> Self {
        self.prefix_add(" GROUP BY ", part)
    }

    pub fn order_by(self, part: &str) -> Self {
        self.prefix_add(" ORDER BY ", part)
    }

    pub fn limit(self) -> Self {
        self.add(" LIMIT :limit ")
    }

    pub fn offset(self) -> Self {
        self.add(" OFFSET :offset ")
    }

    pub fn insert(part: &str) -> Self {
        Self {
            s: "INSERT INTO ".to_owned(),
        }
        .add(part)
    }

    pub fn insert_into(self, part: &str) -> Self {
        self.prefix_add(" INSERT INTO ", part)
    }

    pub fn values(self, part: &str) -> Self {
        self.prefix_add_bracketed(" VALUES ", part)
    }

    pub fn delete_from(part: &str) -> Self {
        Self {
            s: "DELETE FROM ".to_owned(),
        }
        .add(part)
    }

    pub fn returning(self, part: &str) -> Self {
        self.prefix_add(" RETURNING ", part)
    }

    pub fn query_count_decklike() -> Qry {
        Qry::select_count()
            .from_decklike()
            .where_decklike_but_no_deck_id()
    }

    pub fn query_decklike_generic() -> Qry {
        Qry::select_decklike().from_decklike().where_decklike()
    }

    pub fn query_decklike_all_ordered(order_clause: &str) -> Qry {
        Qry::select_decklike()
            .from_decklike()
            .where_decklike_but_no_deck_id()
            .order_by(order_clause)
    }

    pub fn add(mut self, text: &str) -> Self {
        self.s.push_str(text);
        self
    }

    fn prefix_add(mut self, prefix: &str, text: &str) -> Self {
        self.s.push_str(prefix);
        self.s.push_str(text);
        self
    }

    fn prefix_add_bracketed(mut self, prefix: &str, text: &str) -> Self {
        self.s.push_str(prefix);
        self.s.push_str("(");
        self.s.push_str(text);
        self.s.push_str(")");
        self
    }
}
