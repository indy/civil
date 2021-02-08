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

use crate::error::Result;
use crate::lexer::{get_token_value, is_match, tokenize, Token, TokenIdent};
use crate::parser::{
    is_blockquote_start, is_codeblock_start, is_eos, is_hr, is_img, is_numbered_list_item, is_unordered_list_item,
    skip_leading_newlines, skip_leading_whitespace_and_newlines, ParserResult,
};

fn move_head_onto_string<'a>(tokens: &'a [Token<'a>], s: &str) -> ParserResult<'a, String> {
    let mut res = s.to_string();
    res += get_token_value(&tokens[0]);

    Ok((&tokens[1..], res))
}

fn join_past_newline<'a>(tokens: &'a [Token<'a>], s: &str) -> ParserResult<'a, String> {
    let mut res = s.to_string();
    for (i, tok) in tokens.iter().enumerate() {
        if is_match(&tok, TokenIdent::Newline) {
            // reached a newline, skip past these and return our result
            return Ok((skip_leading_newlines(&tokens[i..])?, res));
        } else {
            res += get_token_value(tok);
        }
    }

    Ok((&[], res))
}

fn join_ordered_list<'a>(mut tokens: &'a [Token<'a>]) -> ParserResult<'a, String> {
    let mut res = "".to_string();

    while !tokens.is_empty() {
        let t = tokens;
        let s = res;

        let (t, s) = move_head_onto_string(t, &s)?; // digits
        let (t, s) = move_head_onto_string(t, &s)?; // period
        let (t, s) = move_head_onto_string(t, &s)?; // whitespace

        let (t, s) = join_past_newline(t, &s)?;

        res = s;
        tokens = t;

        if is_numbered_list_item(tokens) {
            res += "\n";
        } else {
            return Ok((tokens, res));
        }
    }

    Ok((&[], res))
}

fn join_unordered_list<'a>(mut tokens: &'a [Token<'a>]) -> ParserResult<'a, String> {
    let mut res = "".to_string();

    while !tokens.is_empty() {
        let t = tokens;
        let s = res;

        let (t, s) = move_head_onto_string(t, &s)?; // hyphen
        let (t, s) = move_head_onto_string(t, &s)?; // whitespace

        let (t, s) = join_past_newline(t, &s)?;

        res = s;
        tokens = t;

        if is_unordered_list_item(tokens) {
            res += "\n";
        } else {
            return Ok((tokens, res));
        }
    }

    Ok((&[], res))
}

// this looks wrong, should there be a check for end of codeblock?
//
fn join_codeblock<'a>(mut tokens: &'a [Token<'a>]) -> ParserResult<'a, String> {
    let mut res = "".to_string();

    while !tokens.is_empty() {
        let (t, s) = move_head_onto_string(tokens, &res)?;
        res = s;
        tokens = t;
    }

    Ok((&[], res))
}

fn join_paragraph<'a>(tokens: &'a [Token]) -> ParserResult<'a, String> {
    join_past_newline(tokens, "")
}

fn join_img<'a>(tokens: &'a [Token]) -> ParserResult<'a, String> {
    join_past_newline(tokens, "") // this needs to be fixed?
}

fn join_blockquote<'a>(tokens: &'a [Token]) -> ParserResult<'a, String> {
    let mut res = "".to_string();
    for (i, tok) in tokens.iter().enumerate() {
        res += get_token_value(tok);
        if is_match(&tok, TokenIdent::BlockquoteEnd) {
            // reached a blockquote end, skip past these and return our result
            return Ok((skip_leading_newlines(&tokens[(i + 1)..])?, res));
        }
    }

    Ok((&[], res))
}

pub fn split(markup: &str) -> Result<Vec<String>> {
    let mut tokens: &[Token] = &tokenize(markup)?;
    let mut res: Vec<String> = vec![];

    while !tokens.is_empty() && !is_eos(tokens) {
        tokens = skip_leading_whitespace_and_newlines(tokens)?;

        let (rem, node) = if is_numbered_list_item(tokens) {
            join_ordered_list(tokens)?
        } else if is_unordered_list_item(tokens) {
            join_unordered_list(tokens)?
        } else if is_codeblock_start(tokens) {
            join_codeblock(tokens)?
        } else if is_hr(tokens) {
            join_paragraph(tokens)? // ????
        } else if is_img(tokens) {
            join_img(tokens)?
        } else if is_blockquote_start(tokens) {
            join_blockquote(tokens)?
        } else {
            join_paragraph(tokens)?
        };

        res.push(node);
        tokens = rem;
    }

    Ok(res)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_split_1() {
        let res = split("hello world").unwrap();

        assert_eq!(res.len(), 1);
        assert_eq!(res[0], "hello world");
    }

    #[test]
    fn test_split_2() {
        let res = split(
            "hello world
another line",
        )
        .unwrap();

        assert_eq!(res.len(), 2);
        assert_eq!(res[0], "hello world");
        assert_eq!(res[1], "another line");
    }

    #[test]
    fn test_split_3() {
        let res = split(
            "#h A header

- first unordered list item
- second unordered list item",
        )
        .unwrap();

        assert_eq!(res.len(), 2);
        assert_eq!(res[0], "#h A header");
        assert_eq!(
            res[1],
            "- first unordered list item
- second unordered list item"
        );
    }
}
