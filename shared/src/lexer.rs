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

use crate::error::{Error, Result};
use strum_macros::EnumDiscriminants;

#[derive(Copy, Clone, Debug, Eq, PartialEq, EnumDiscriminants)]
#[strum_discriminants(name(TokenIdent))]
pub enum Token<'a> {
    Asterisk(usize),
    At(usize),
    BackTick(usize),
    BlockquoteBegin(usize),
    BlockquoteEnd(usize),
    BracketBegin(usize),
    BracketEnd(usize),
    Caret(usize),
    Tilde(usize),
    Digits(usize, &'a str),
    DoubleQuote(usize, &'a str),
    Hash(usize),
    Hyphen(usize),
    Newline(usize),
    ParenEnd(usize),
    ParenBegin(usize),
    Period(usize),
    Pipe(usize),
    Text(usize, &'a str),
    Underscore(usize),
    Whitespace(usize, &'a str),
    EOS(usize), // end of stream
}

pub(crate) fn get_token_value<'a>(token: &'a Token) -> &'a str {
    match token {
        Token::Asterisk(_) => "*",
        Token::At(_) => "@",
        Token::BackTick(_) => "`",
        Token::BlockquoteBegin(_) => ">>>",
        Token::BlockquoteEnd(_) => "<<<",
        Token::BracketEnd(_) => "]",
        Token::BracketBegin(_) => "[",
        Token::Caret(_) => "^",
        Token::Digits(_, s) => s,
        Token::DoubleQuote(_, s) => s,
        Token::Hash(_) => "#",
        Token::Hyphen(_) => "-",
        Token::Newline(_) => "\n",
        Token::ParenEnd(_) => ")",
        Token::ParenBegin(_) => "(",
        Token::Period(_) => ".",
        Token::Pipe(_) => "|",
        Token::Text(_, s) => s,
        Token::Tilde(_) => "~",
        Token::Underscore(_) => "_",
        Token::Whitespace(_, s) => s,
        Token::EOS(_) => "",
    }
}

pub(crate) fn get_token_pos<'a>(token: &Token) -> usize {
    match token {
        Token::Asterisk(pos) => *pos,
        Token::At(pos) => *pos,
        Token::BackTick(pos) => *pos,
        Token::BlockquoteBegin(pos) => *pos,
        Token::BlockquoteEnd(pos) => *pos,
        Token::BracketEnd(pos) => *pos,
        Token::BracketBegin(pos) => *pos,
        Token::Caret(pos) => *pos,
        Token::Digits(pos, _) => *pos,
        Token::DoubleQuote(pos, _) => *pos,
        Token::Hash(pos) => *pos,
        Token::Hyphen(pos) => *pos,
        Token::Newline(pos) => *pos,
        Token::ParenEnd(pos) => *pos,
        Token::ParenBegin(pos) => *pos,
        Token::Period(pos) => *pos,
        Token::Pipe(pos) => *pos,
        Token::Text(pos, _) => *pos,
        Token::Tilde(pos) => *pos,
        Token::Underscore(pos) => *pos,
        Token::Whitespace(pos, _) => *pos,
        Token::EOS(pos) => *pos,
    }
}

pub fn tokenize(s: &str) -> Result<Vec<Token>> {
    let mut input = s;
    let mut tokens = Vec::new();
    let mut index = 0;

    while !input.is_empty() {
        if let Some(ch) = input.chars().next() {
            let (token, characters, bytes) = match ch {
                '*' => (Token::Asterisk(index), 1, 1),
                '@' => (Token::At(index), 1, 1),
                '`' => (Token::BackTick(index), 1, 1),
                '[' => (Token::BracketBegin(index), 1, 1),
                ']' => (Token::BracketEnd(index), 1, 1),
                '^' => (Token::Caret(index), 1, 1),
                '"' | '“' | '”' => eat_doublequote(index, &input)?,
                '#' => (Token::Hash(index), 1, 1),
                '-' => (Token::Hyphen(index), 1, 1),
                '\n' => (Token::Newline(index), 1, 1),
                '(' => (Token::ParenBegin(index), 1, 1),
                ')' => (Token::ParenEnd(index), 1, 1),
                '.' => (Token::Period(index), 1, 1),
                '|' => (Token::Pipe(index), 1, 1),
                '~' => (Token::Tilde(index), 1, 1),
                '_' => (Token::Underscore(index), 1, 1),
                '>' => eat_blockquote_begin_or_greater_than_character(index, &input)?,
                '<' => eat_blockquote_end_or_less_than_character(index, &input)?,
                '0'..='9' => eat_digits(index, &input)?,
                ch if ch.is_whitespace() => eat_whitespace(index, &input)?,
                _ => eat_text(index, &input)?,
            };

            index = index + characters;
            input = &input[bytes..];
            tokens.push(token)
        } else {
            return Err(Error::Lexer);
        }
    }

    tokens.push(Token::EOS(index));

    Ok(tokens)
}

fn eat_doublequote(index: usize, input: &str) -> Result<(Token, usize, usize)> {
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

fn eat_blockquote_begin_or_greater_than_character(index: usize, input: &str) -> Result<(Token, usize, usize)> {
    // check if the next three characters are '>'
    let count = input.chars().count();
    let mut chars = input.chars();
    if count >= 3 && chars.next() == Some('>') && chars.next() == Some('>') && chars.next() == Some('>') {
        Ok((Token::BlockquoteBegin(index), 3, 3))
    } else {
        // we know that the first character is definitely a >
        Ok((Token::Text(index, &input[..1]), 1, 1))
    }
}

fn eat_blockquote_end_or_less_than_character(index: usize, input: &str) -> Result<(Token, usize, usize)> {
    // check if the next three characters are '<'
    let count = input.chars().count();
    let mut chars = input.chars();
    if count >= 3 && chars.next() == Some('<') && chars.next() == Some('<') && chars.next() == Some('<') {
        Ok((Token::BlockquoteEnd(index), 3, 3))
    } else {
        // we know that the first character is definitely a <
        Ok((Token::Text(index, &input[..1]), 1, 1))
    }
}

fn eat_digits(index: usize, input: &str) -> Result<(Token, usize, usize)> {
    let mut ch_counter: usize = 0;
    for (ind, ch) in input.char_indices() {
        if !ch.is_digit(10) {
            return Ok((Token::Digits(index, &input[..ind]), ch_counter, ind));
        }
        ch_counter += 1;
    }

    Ok((Token::Digits(index, input), input.chars().count(), input.len()))
}

fn eat_whitespace(index: usize, input: &str) -> Result<(Token, usize, usize)> {
    let mut ch_counter: usize = 0;
    for (ind, ch) in input.char_indices() {
        if !ch.is_whitespace() {
            return Ok((Token::Whitespace(index, &input[..ind]), ch_counter, ind));
        }
        ch_counter += 1;
    }

    Ok((Token::Whitespace(index, input), input.chars().count(), input.len()))
}

// greedy
fn eat_text(index: usize, input: &str) -> Result<(Token, usize, usize)> {
    // the ind from char_indices may increment by more than one for unicode characters
    // so we'll need to keep count of the actual number of characters processed
    //
    let mut ch_counter: usize = 0;
    for (ind, ch) in input.char_indices() {
        if !is_text(ch) {
            return Ok((Token::Text(index, &input[..ind]), ch_counter, ind));
        }
        ch_counter += 1;
    }

    Ok((Token::Text(index, input), input.chars().count(), input.len()))
}

fn is_text(ch: char) -> bool {
    match ch {
        '\n' | '[' | ']' | '(' | ')' | '@' | '_' | '*' | '`' | '^' | '~' | '"' | '“' | '”' | '|' | '#' | '>' | '<' => {
            false
        }
        _ => true,
    }
}

// split the token slice at the first divider token, return the two token slices on either side
//
pub fn split_tokens_at<'a>(tokens: &'a [Token<'a>], divider: TokenIdent) -> Result<(&'a [Token<'a>], &'a [Token<'a>])> {
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
        let t = tokenize("foo *bar* @ 12345").unwrap();

        assert_eq!(t.len(), 9);

        let (a, b) = split_tokens_at(&t, TokenIdent::At).unwrap();

        assert_eq!(a.len(), 5);
        assert_eq!(b.len(), 3);

        assert_eq!(
            a,
            &[
                Token::Text(0, "foo "),
                Token::Asterisk(4),
                Token::Text(5, "bar"),
                Token::Asterisk(8),
                Token::Whitespace(9, " "),
            ]
        );

        assert_eq!(
            b,
            &[Token::Whitespace(11, " "), Token::Digits(12, "12345"), Token::EOS(17),]
        )
    }

    #[test]
    fn test_lexer() {
        tok("[]", &[Token::BracketBegin(0), Token::BracketEnd(1), Token::EOS(2)]);

        tok(
            "here are some words",
            &[Token::Text(0, "here are some words"), Token::EOS(19)],
        );

        tok("5", &[Token::Digits(0, "5"), Token::EOS(1)]);

        tok(
            "foo *bar* @ 456789",
            &[
                Token::Text(0, "foo "),
                Token::Asterisk(4),
                Token::Text(5, "bar"),
                Token::Asterisk(8),
                Token::Whitespace(9, " "),
                Token::At(10),
                Token::Whitespace(11, " "),
                Token::Digits(12, "456789"),
                Token::EOS(18),
            ],
        );
    }

    #[test]
    fn test_lexer_blockquote() {
        {
            tok(
                ">>> only a blockquote <<<",
                &[
                    Token::BlockquoteBegin(0),
                    Token::Whitespace(3, " "),
                    Token::Text(4, "only a blockquote "),
                    Token::BlockquoteEnd(22),
                    Token::EOS(25),
                ],
            );
        }
        {
            // not a blockquote
            tok(
                ">> not quite a blockquote",
                &[
                    Token::Text(0, ">"),
                    Token::Text(1, ">"),
                    Token::Whitespace(2, " "),
                    Token::Text(3, "not quite a blockquote"),
                    Token::EOS(25),
                ],
            );
        }
        {
            tok(
                "prefix words >>> blockquote <<< suffix words",
                &[
                    Token::Text(0, "prefix words "),
                    Token::BlockquoteBegin(13),
                    Token::Whitespace(16, " "),
                    Token::Text(17, "blockquote "),
                    Token::BlockquoteEnd(28),
                    Token::Whitespace(31, " "),
                    Token::Text(32, "suffix words"),
                    Token::EOS(44),
                ],
            );
        }
    }

    #[test]
    fn test_char_length_bug() {
        // the apostrophe is unicode, so the number of bytes in
        // the string doesn't match the number of characters
        //
        tok(
            "For, Putin’s mind?
#-",
            &[
                Token::Text(0, "For, Putin’s mind?"),
                Token::Newline(18),
                Token::Hash(19),
                Token::Hyphen(20),
                Token::EOS(21),
            ],
        );
    }

    #[test]
    fn test_lexer_image_syntax() {
        // the three kinds of lexed streams for representing fourc codes:

        // fourc starts with digit, ends in letter
        tok(
            "@img(00a.jpg)",
            &[
                Token::At(0),
                Token::Text(1, "img"),
                Token::ParenBegin(4),
                Token::Digits(5, "00"),
                Token::Text(7, "a.jpg"),
                Token::ParenEnd(12),
                Token::EOS(13),
            ],
        );

        // fourc starts with digit, ends in digit
        tok(
            "@img(000.jpg)",
            &[
                Token::At(0),
                Token::Text(1, "img"),
                Token::ParenBegin(4),
                Token::Digits(5, "000"),
                Token::Period(8),
                Token::Text(9, "jpg"),
                Token::ParenEnd(12),
                Token::EOS(13),
            ],
        );

        // fourc starts with letter, ends in digit
        tok(
            "@img(a00.jpg)",
            &[
                Token::At(0),
                Token::Text(1, "img"),
                Token::ParenBegin(4),
                Token::Text(5, "a00.jpg"),
                Token::ParenEnd(12),
                Token::EOS(13),
            ],
        );

        // fourc starts with letter, ends in letter
        tok(
            "@img(abc.jpg)",
            &[
                Token::At(0),
                Token::Text(1, "img"),
                Token::ParenBegin(4),
                Token::Text(5, "abc.jpg"),
                Token::ParenEnd(12),
                Token::EOS(13),
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
                Token::EOS(18),
            ],
        );
        tok(
            "bob said “hello”",
            &[
                Token::Text(0, "bob said "),
                Token::DoubleQuote(9, "“"),
                Token::Text(10, "hello"),
                Token::DoubleQuote(15, "”"),
                Token::EOS(16),
            ],
        );
        tok(
            "charlie said “”",
            &[
                Token::Text(0, "charlie said "),
                Token::DoubleQuote(13, "“"),
                Token::DoubleQuote(14, "”"),
                Token::EOS(15),
            ],
        );
    }
}
