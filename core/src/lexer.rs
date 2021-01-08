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
    Asterisk,
    At,
    BackTick,
    BlockquoteBegin,
    BlockquoteEnd,
    BracketBegin,
    BracketEnd,
    Caret,
    Tilde,
    Digits(&'a str),
    DoubleQuote,
    Hash,
    Hyphen,
    Newline,
    ParenEnd,
    ParenBegin,
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
        Token::At => "@",
        Token::BackTick => "`",
        Token::BlockquoteBegin => ">>>",
        Token::BlockquoteEnd => "<<<",
        Token::BracketEnd => "]",
        Token::BracketBegin => "[",
        Token::Caret => "^",
        Token::Digits(s) => s,
        Token::DoubleQuote => "\"",
        Token::Hash => "#",
        Token::Hyphen => "-",
        Token::Newline => "\n",
        Token::ParenEnd => ")",
        Token::ParenBegin => "(",
        Token::Period => ".",
        Token::Pipe => "|",
        Token::Text(s) => s,
        Token::Tilde => "~",
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
                '@' => (Token::At, 1),
                '`' => (Token::BackTick, 1),
                '[' => (Token::BracketBegin, 1),
                ']' => (Token::BracketEnd, 1),
                '^' => (Token::Caret, 1),
                '"' => (Token::DoubleQuote, 1),
                '#' => (Token::Hash, 1),
                '-' => (Token::Hyphen, 1),
                '\n' => (Token::Newline, 1),
                '(' => (Token::ParenBegin, 1),
                ')' => (Token::ParenEnd, 1),
                '.' => (Token::Period, 1),
                '|' => (Token::Pipe, 1),
                '~' => (Token::Tilde, 1),
                '_' => (Token::Underscore, 1),
                '>' => eat_blockquote_begin_or_greater_than_character(&input)?,
                '<' => eat_blockquote_end_or_less_than_character(&input)?,
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

fn eat_blockquote_begin_or_greater_than_character(input: &str) -> Result<(Token, usize)> {
    // check if the next three characters are '>'
    let mut chars = input.chars();
    if input.len() >= 3 && chars.next() == Some('>') && chars.next() == Some('>') && chars.next() == Some('>') {
        Ok((Token::BlockquoteBegin, 3))
    } else {
        // we know that the first character is definitely a >
        Ok((Token::Text(&input[..1]), 1))
    }
}

fn eat_blockquote_end_or_less_than_character(input: &str) -> Result<(Token, usize)> {
    // check if the next three characters are '<'
    let mut chars = input.chars();
    if input.len() >= 3 && chars.next() == Some('<') && chars.next() == Some('<') && chars.next() == Some('<') {
        Ok((Token::BlockquoteEnd, 3))
    } else {
        // we know that the first character is definitely a <
        Ok((Token::Text(&input[..1]), 1))
    }
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
        '\n' | '[' | ']' | '(' | ')' | '@' | '_' | '*' | '`' | '^' | '~' | '"' | '|' | '#' | '>' | '<' => false,
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
        tok("[]", &[Token::BracketBegin, Token::BracketEnd, Token::EOS]);

        tok("here are some words", &[Token::Text("here are some words"), Token::EOS]);

        tok("5", &[Token::Digits("5"), Token::EOS]);

        tok(
            "foo *bar* @ 456789",
            &[
                Token::Text("foo "),
                Token::Asterisk,
                Token::Text("bar"),
                Token::Asterisk,
                Token::Whitespace(" "),
                Token::At,
                Token::Whitespace(" "),
                Token::Digits("456789"),
                Token::EOS,
            ],
        );
    }

    #[test]
    fn test_lexer_blockquote() {
        {
            tok(
                ">>> only a blockquote <<<",
                &[
                    Token::BlockquoteBegin,
                    Token::Whitespace(" "),
                    Token::Text("only a blockquote "),
                    Token::BlockquoteEnd,
                    Token::EOS,
                ],
            );
        }
        {
            // not a blockquote
            tok(
                ">> not quite a blockquote",
                &[
                    Token::Text(">"),
                    Token::Text(">"),
                    Token::Whitespace(" "),
                    Token::Text("not quite a blockquote"),
                    Token::EOS,
                ],
            );
        }
        {
            tok(
                "prefix words >>> blockquote <<< suffix words",
                &[
                    Token::Text("prefix words "),
                    Token::BlockquoteBegin,
                    Token::Whitespace(" "),
                    Token::Text("blockquote "),
                    Token::BlockquoteEnd,
                    Token::Whitespace(" "),
                    Token::Text("suffix words"),
                    Token::EOS,
                ],
            );
        }
    }

    #[test]
    fn test_lexer_image_syntax() {
        // the three kinds of lexed streams for representing fourc codes:

        // fourc starts with digit, ends in letter
        tok(
            "@img(00a.jpg)",
            &[
                Token::At,
                Token::Text("img"),
                Token::ParenBegin,
                Token::Digits("00"),
                Token::Text("a.jpg"),
                Token::ParenEnd,
                Token::EOS,
            ],
        );

        // fourc starts with digit, ends in digit
        tok(
            "@img(000.jpg)",
            &[
                Token::At,
                Token::Text("img"),
                Token::ParenBegin,
                Token::Digits("000"),
                Token::Period,
                Token::Text("jpg"),
                Token::ParenEnd,
                Token::EOS,
            ],
        );

        // fourc starts with letter, ends in digit
        tok(
            "@img(a00.jpg)",
            &[
                Token::At,
                Token::Text("img"),
                Token::ParenBegin,
                Token::Text("a00.jpg"),
                Token::ParenEnd,
                Token::EOS,
            ],
        );

        // fourc starts with letter, ends in letter
        tok(
            "@img(abc.jpg)",
            &[
                Token::At,
                Token::Text("img"),
                Token::ParenBegin,
                Token::Text("abc.jpg"),
                Token::ParenEnd,
                Token::EOS,
            ],
        );
    }
}
