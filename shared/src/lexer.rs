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

use crate::error::Error;
use strum_macros::EnumDiscriminants;

#[derive(Copy, Clone, Debug, Eq, PartialEq, EnumDiscriminants)]
#[strum_discriminants(name(TokenIdent))]
pub enum Token<'a> {
    Colon(usize),
    Digits(usize, &'a str),
    DoubleQuote(usize, &'a str),
    Hyphen(usize),
    Newline(usize),
    ParenEnd(usize),
    ParenBegin(usize),
    Period(usize),
    Text(usize, &'a str),
    Whitespace(usize, &'a str),
    Eos(usize), // end of stream
}

pub(crate) fn get_token_value<'a>(token: &'a Token) -> &'a str {
    match token {
        Token::Colon(_) => ":",
        Token::Digits(_, s) => s,
        Token::DoubleQuote(_, s) => s,
        Token::Hyphen(_) => "-",
        Token::Newline(_) => "\n",
        Token::ParenEnd(_) => ")",
        Token::ParenBegin(_) => "(",
        Token::Period(_) => ".",
        Token::Text(_, s) => s,
        Token::Whitespace(_, s) => s,
        Token::Eos(_) => "",
    }
}

pub(crate) fn get_token_pos(token: &Token) -> usize {
    match token {
        Token::Colon(pos) => *pos,
        Token::Digits(pos, _) => *pos,
        Token::DoubleQuote(pos, _) => *pos,
        Token::Hyphen(pos) => *pos,
        Token::Newline(pos) => *pos,
        Token::ParenEnd(pos) => *pos,
        Token::ParenBegin(pos) => *pos,
        Token::Period(pos) => *pos,
        Token::Text(pos, _) => *pos,
        Token::Whitespace(pos, _) => *pos,
        Token::Eos(pos) => *pos,
    }
}

pub fn tokenize(s: &str) -> crate::Result<Vec<Token<'_>>> {
    let mut input = s;
    let mut tokens = Vec::new();
    let mut index = 0;

    while !input.is_empty() {
        if let Some(ch) = input.chars().next() {
            let (token, characters, bytes) = match ch {
                ':' => (Token::Colon(index), 1, 1),
                '"' | '“' | '”' => eat_doublequote(index, input)?,
                '-' => (Token::Hyphen(index), 1, 1),
                '\n' => (Token::Newline(index), 1, 1),
                '(' => (Token::ParenBegin(index), 1, 1),
                ')' => (Token::ParenEnd(index), 1, 1),
                '.' => (Token::Period(index), 1, 1),
                '0'..='9' => eat_digits(index, input)?,
                ch if ch.is_whitespace() => eat_whitespace(index, input)?,
                _ => eat_text(index, input)?,
            };

            index += characters;
            input = &input[bytes..];
            tokens.push(token)
        } else {
            return Err(Error::Lexer);
        }
    }

    tokens.push(Token::Eos(index));

    Ok(tokens)
}

fn eat_doublequote(index: usize, input: &str) -> crate::Result<(Token<'_>, usize, usize)> {
    let mut found = false;
    for (ind, _ch) in input.char_indices() {
        if found {
            return Ok((Token::DoubleQuote(index, &input[..ind]), 1, ind));
        } else {
            found = true;
        }
    }
    Ok((Token::DoubleQuote(index, input), input.chars().count(), input.len()))
}

fn eat_digits(index: usize, input: &str) -> crate::Result<(Token<'_>, usize, usize)> {
    for (ch_counter, (ind, ch)) in input.char_indices().enumerate() {
        if !ch.is_ascii_digit() {
            return Ok((Token::Digits(index, &input[..ind]), ch_counter, ind));
        }
    }

    Ok((Token::Digits(index, input), input.chars().count(), input.len()))
}

fn eat_whitespace(index: usize, input: &str) -> crate::Result<(Token<'_>, usize, usize)> {
    for (ch_counter, (ind, ch)) in input.char_indices().enumerate() {
        if !ch.is_whitespace() || ch == '\n' {
            return Ok((Token::Whitespace(index, &input[..ind]), ch_counter, ind));
        }
    }

    Ok((Token::Whitespace(index, input), input.chars().count(), input.len()))
}

// greedy
fn eat_text(index: usize, input: &str) -> crate::Result<(Token<'_>, usize, usize)> {
    // the ind from char_indices may increment by more than one for unicode characters
    // so we'll need to keep count of the actual number of characters processed
    //
    for (ch_counter, (ind, ch)) in input.char_indices().enumerate() {
        if !is_text(ch) {
            return Ok((Token::Text(index, &input[..ind]), ch_counter, ind));
        }
    }

    Ok((Token::Text(index, input), input.chars().count(), input.len()))
}

fn is_text(ch: char) -> bool {
    match ch {
        '\n' | '(' | ')' | '"' | '“' | '”' | ':' => false,
        _ => true,
    }
}

// split the token slice at the first divider token, return the two token slices on either side
//
pub fn split_tokens_at<'a>(
    tokens: &'a [Token<'a>],
    divider: TokenIdent,
) -> crate::Result<(&'a [Token<'a>], &'a [Token<'a>])> {
    if let Some(index) = tokens.iter().position(|&t| Into::<TokenIdent>::into(t) == divider) {
        let len = tokens.len();
        Ok((&tokens[0..index], &tokens[(index + 1)..len]))
    } else {
        Err(Error::Parser)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn tok(input: &'static str, expected: &[Token]) {
        assert_eq!(tokenize(input).unwrap(), expected);
    }

    #[test]
    fn test_split_token_at() {
        let t = tokenize("foo :bar: . 12345").unwrap();

        assert_eq!(t.len(), 9);

        let (a, b) = split_tokens_at(&t, TokenIdent::Period).unwrap();

        assert_eq!(a.len(), 5);
        assert_eq!(b.len(), 3);

        assert_eq!(
            a,
            &[
                Token::Text(0, "foo "),
                Token::Colon(4),
                Token::Text(5, "bar"),
                Token::Colon(8),
                Token::Whitespace(9, " "),
            ]
        );

        assert_eq!(
            b,
            &[Token::Whitespace(11, " "), Token::Digits(12, "12345"), Token::Eos(17),]
        )
    }

    #[test]
    fn test_lexer() {
        tok(
            "here are some words",
            &[Token::Text(0, "here are some words"), Token::Eos(19)],
        );

        tok("5", &[Token::Digits(0, "5"), Token::Eos(1)]);

        tok(
            "foo :bar: . 456789",
            &[
                Token::Text(0, "foo "),
                Token::Colon(4),
                Token::Text(5, "bar"),
                Token::Colon(8),
                Token::Whitespace(9, " "),
                Token::Period(10),
                Token::Whitespace(11, " "),
                Token::Digits(12, "456789"),
                Token::Eos(18),
            ],
        );
    }

    #[test]
    fn test_char_length_bug() {
        // the apostrophe is unicode, so the number of bytes in
        // the string doesn't match the number of characters
        //
        tok(
            "For, Putin’s mind?
:-",
            &[
                Token::Text(0, "For, Putin’s mind?"),
                Token::Newline(18),
                Token::Colon(19),
                Token::Hyphen(20),
                Token::Eos(21),
            ],
        );
    }

    #[test]
    fn test_lexer_image_syntax() {
        // the three kinds of lexed streams for representing fourc codes:

        // fourc starts with digit, ends in letter
        tok(
            ":img(00a.jpg)",
            &[
                Token::Colon(0),
                Token::Text(1, "img"),
                Token::ParenBegin(4),
                Token::Digits(5, "00"),
                Token::Text(7, "a.jpg"),
                Token::ParenEnd(12),
                Token::Eos(13),
            ],
        );

        // fourc starts with digit, ends in digit
        tok(
            ":img(000.jpg)",
            &[
                Token::Colon(0),
                Token::Text(1, "img"),
                Token::ParenBegin(4),
                Token::Digits(5, "000"),
                Token::Period(8),
                Token::Text(9, "jpg"),
                Token::ParenEnd(12),
                Token::Eos(13),
            ],
        );

        // fourc starts with letter, ends in digit
        tok(
            ":img(a00.jpg)",
            &[
                Token::Colon(0),
                Token::Text(1, "img"),
                Token::ParenBegin(4),
                Token::Text(5, "a00.jpg"),
                Token::ParenEnd(12),
                Token::Eos(13),
            ],
        );

        // fourc starts with letter, ends in letter
        tok(
            ":img(abc.jpg)",
            &[
                Token::Colon(0),
                Token::Text(1, "img"),
                Token::ParenBegin(4),
                Token::Text(5, "abc.jpg"),
                Token::ParenEnd(12),
                Token::Eos(13),
            ],
        );
    }

    #[test]
    fn test_double_quotes() {
        tok(
            "alice said \"hello\"",
            &[
                Token::Text(0, "alice said "),
                Token::DoubleQuote(11, "\""),
                Token::Text(12, "hello"),
                Token::DoubleQuote(17, "\""),
                Token::Eos(18),
            ],
        );
        tok(
            "bob said “hello”",
            &[
                Token::Text(0, "bob said "),
                Token::DoubleQuote(9, "“"),
                Token::Text(10, "hello"),
                Token::DoubleQuote(15, "”"),
                Token::Eos(16),
            ],
        );
        tok(
            "charlie said “”",
            &[
                Token::Text(0, "charlie said "),
                Token::DoubleQuote(13, "“"),
                Token::DoubleQuote(14, "”"),
                Token::Eos(15),
            ],
        );
    }
}
