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

use crate::error::{Error, Result};
use strum_macros::EnumDiscriminants;

#[derive(Copy, Clone, Debug, Eq, PartialEq, EnumDiscriminants)]
#[strum_discriminants(name(TokenIdent))]
pub enum Token<'a> {
    Asterisk,
    BackTick,
    BracketEnd,
    BracketStart,
    Caret,
    Tilde,
    Digits(&'a str),
    DoubleQuote,
    Hash,
    Hyphen,
    Newline,
    Period,
    Pipe,
    Text(&'a str),
    Underscore,
    Whitespace(&'a str),
    EOS, // end of stream
}

pub(crate) fn get_token_value<'a>(token: &'a Token) -> &'a str {
    match token {
        Token::Asterisk => "*",
        Token::BackTick => "`",
        Token::BracketEnd => "]",
        Token::BracketStart => "[",
        Token::Caret => "^",
        Token::Tilde => "~",
        Token::Digits(s) => s,
        Token::DoubleQuote => "\"",
        Token::Hash => "#",
        Token::Hyphen => "-",
        Token::Newline => "\n",
        Token::Period => ".",
        Token::Pipe => "|",
        Token::Text(s) => s,
        Token::Underscore => "_",
        Token::Whitespace(s) => s,
        Token::EOS => "",
    }
}

pub(crate) fn is_match(token: &Token, token_ident: TokenIdent) -> bool {
    Into::<TokenIdent>::into(token) == token_ident
}

pub fn tokenize(s: &str) -> Result<Vec<Token>> {
    let mut input = s;
    let mut tokens = Vec::new();

    while !input.is_empty() {
        if let Some(ch) = input.chars().next() {
            let (token, size) = match ch {
                '*' => (Token::Asterisk, 1),
                '`' => (Token::BackTick, 1),
                '[' => (Token::BracketStart, 1),
                ']' => (Token::BracketEnd, 1),
                '^' => (Token::Caret, 1),
                '~' => (Token::Tilde, 1),
                '"' => (Token::DoubleQuote, 1),
                '#' => (Token::Hash, 1),
                '-' => (Token::Hyphen, 1),
                '\n' => (Token::Newline, 1),
                '.' => (Token::Period, 1),
                '|' => (Token::Pipe, 1),
                '_' => (Token::Underscore, 1),
                '0'..='9' => eat_digits(&input)?,
                ch if ch.is_whitespace() => eat_whitespace(&input)?,
                _ => eat_text(&input)?,
            };

            input = &input[size..];
            tokens.push(token)
        } else {
            return Err(Error::Lexer);
        }
    }

    tokens.push(Token::EOS);

    Ok(tokens)
}

fn eat_digits(input: &str) -> Result<(Token, usize)> {
    for (ind, ch) in input.char_indices() {
        if !ch.is_digit(10) {
            return Ok((Token::Digits(&input[..ind]), ind));
        }
    }

    Ok((Token::Digits(input), input.len()))
}

fn eat_whitespace(input: &str) -> Result<(Token, usize)> {
    for (ind, ch) in input.char_indices() {
        if !ch.is_whitespace() {
            return Ok((Token::Whitespace(&input[..ind]), ind));
        }
    }

    Ok((Token::Whitespace(input), input.len()))
}

// greedy
fn eat_text(input: &str) -> Result<(Token, usize)> {
    for (ind, ch) in input.char_indices() {
        if !is_text(ch) {
            return Ok((Token::Text(&input[..ind]), ind));
        }
    }

    Ok((Token::Text(input), input.len()))
}

fn is_text(ch: char) -> bool {
    match ch {
        '\n' | '[' | ']' | '_' | '*' | '`' | '^' | '~' | '"' | '|' | '#' => false,
        _ => true,
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn tok(input: &'static str, expected: &[Token]) {
        assert_eq!(tokenize(input).unwrap(), expected);
    }

    #[test]
    fn test_lexer() {
        tok("[]", &[Token::BracketStart, Token::BracketEnd, Token::EOS]);

        tok("here are some words", &[Token::Text("here are some words"), Token::EOS]);

        tok("5", &[Token::Digits("5"), Token::EOS]);

        tok(
            "foo *bar* 456789",
            &[
                Token::Text("foo "),
                Token::Asterisk,
                Token::Text("bar"),
                Token::Asterisk,
                Token::Whitespace(" "),
                Token::Digits("456789"),
                Token::EOS,
            ],
        );
    }
}
