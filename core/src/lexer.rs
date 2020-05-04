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

#[derive(Copy, Clone, Debug, Eq, PartialEq)]
pub enum Token<'a> {
    Asterisk,
    BackTick,
    BracketEnd,
    BracketStart,
    Caret,
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
    End,
}

pub fn tokenize(s: &str) -> Result<Vec<Token>> {
    let mut lex = Lexer::new(s);
    let mut res = Vec::new();

    loop {
        match lex.eat_token()? {
            Token::End => break,
            tok => res.push(tok),
        }
    }

    Ok(res)
}

struct Lexer<'a> {
    input: &'a str,
}

impl<'a> Lexer<'a> {
    pub fn new(input: &str) -> Lexer {
        Lexer { input }
    }

    pub fn eat_token(&mut self) -> Result<Token<'a>> {
        if self.input.is_empty() {
            self.input = &self.input[..0];
            return Ok(Token::End);
        }

        if let Some(ch) = self.input.chars().nth(0) {
            let res = match ch {
                '*' => Ok((Token::Asterisk, 1)),
                '`' => Ok((Token::BackTick, 1)),
                '[' => Ok((Token::BracketStart, 1)),
                ']' => Ok((Token::BracketEnd, 1)),
                '^' => Ok((Token::Caret, 1)),
                '"' => Ok((Token::DoubleQuote, 1)),
                '#' => Ok((Token::Hash, 1)),
                '-' => Ok((Token::Hyphen, 1)),
                '\n' => Ok((Token::Newline, 1)),
                '.' => Ok((Token::Period, 1)),
                '|' => Ok((Token::Pipe, 1)),
                '_' => Ok((Token::Underscore, 1)),
                '0'..='9' => eat_digits(&self.input),
                ch if ch.is_whitespace() => eat_whitespace(&self.input),
                _ => eat_text(&self.input)
            };

            let (tok, size) = match res {
                Ok(v) => v,
                Err(kind) => return Err(kind),
            };

            self.input = &self.input[size..];

            Ok(tok)
        } else {
            Err(Error::Lexer)
        }
    }
}

fn eat_digits(input: &str) -> Result<(Token, usize)> {
    for (ind, ch) in input.char_indices() {
        if !ch.is_digit(10) {
            return Ok((Token::Digits(&input[..ind]), ind))
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
        '\n' | '[' | ']' | '_' | '*' | '`' | '^' | '"' | '|' | '#' => {
            false
        }
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
        tok("[]", &[Token::BracketStart, Token::BracketEnd]);

        tok("here are some words", &[Token::Text("here are some words")]);

        tok("5", &[Token::Digits("5")]);

        tok("foo *bar* 456789", &[Token::Text("foo "),
                                  Token::Asterisk,
                                  Token::Text("bar"),
                                  Token::Asterisk,
                                  Token::Whitespace(" "),
                                  Token::Digits("456789")]);
    }
}
