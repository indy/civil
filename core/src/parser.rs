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
use crate::lexer::{get_token_value, Token, TokenIdent};
use strum_macros::EnumDiscriminants;

// a result type that returns a tuple of the remaining tokens as well as the given return value
pub type ParserResult<'a, T> = Result<(&'a [Token<'a>], T)>;

#[derive(Debug)]
pub enum CodeblockLanguage {
    Rust,
}

#[derive(Debug, EnumDiscriminants)]
#[strum_discriminants(name(NodeIdent))]
pub enum Node {
    Codeblock(Option<CodeblockLanguage>, String),
    Highlight(Vec<Node>),
    Link(String, Vec<Node>),
    ListItem(Vec<Node>),
    Marginnote(Vec<Node>),
    OrderedList(Vec<Node>),
    Paragraph(Vec<Node>),
    Quotation(Vec<Node>),
    Sidenote(Vec<Node>),
    Strong(Vec<Node>),
    Text(String),
    Underlined(Vec<Node>),
    UnorderedList(Vec<Node>),
}

pub(crate) fn is_numbered_list_item(tokens: &'_ [Token]) -> bool {
    is_token_at_index(tokens, 0, TokenIdent::Digits)
        && is_token_at_index(tokens, 1, TokenIdent::Period)
        && is_token_at_index(tokens, 2, TokenIdent::Whitespace)
}

pub(crate) fn is_unordered_list_item(tokens: &'_ [Token]) -> bool {
    is_token_at_index(tokens, 0, TokenIdent::Hyphen) && is_token_at_index(tokens, 1, TokenIdent::Whitespace)
}

pub(crate) fn is_codeblock(tokens: &'_ [Token]) -> bool {
    let len = tokens.len();
    is_token_at_index(tokens, 0, TokenIdent::BackTick)
        && is_token_at_index(tokens, 1, TokenIdent::BackTick)
        && is_token_at_index(tokens, 2, TokenIdent::BackTick)
        && is_token_at_index(tokens, len - 3, TokenIdent::BackTick)
        && is_token_at_index(tokens, len - 2, TokenIdent::BackTick)
        && is_token_at_index(tokens, len - 1, TokenIdent::BackTick)
}

pub(crate) fn is_codeblock_start(tokens: &'_ [Token]) -> bool {
    is_token_at_index(tokens, 0, TokenIdent::BackTick)
        && is_token_at_index(tokens, 1, TokenIdent::BackTick)
        && is_token_at_index(tokens, 2, TokenIdent::BackTick)
}

pub fn parse(tokens: Vec<Token>) -> Result<Vec<Node>> {
    let mut tokens: &[Token] = &tokens;
    let mut res = Vec::new();

    tokens = skip_leading_whitespace_and_newlines(&tokens)?;
    while tokens.len() > 0 {
        let (rem, node) = if is_numbered_list_item(tokens) {
            eat_ordered_list(tokens)?
        } else if is_unordered_list_item(tokens) {
            eat_unordered_list(tokens)?
        } else if is_codeblock(tokens) {
            eat_codeblock(tokens)?
        } else {
            eat_paragraph(tokens)?
        };

        res.push(node);
        tokens = rem;
    }

    Ok(res)
}

fn eat_ordered_list<'a>(mut tokens: &'a [Token<'a>]) -> ParserResult<Node> {
    let mut children: Vec<Node> = vec![];

    while !tokens.is_empty() {
        tokens = &tokens[3..]; // digits, period, whitespace

        let (remaining, list_item_children) = eat_to_newline(tokens)?;
        tokens = remaining;

        if !list_item_children.is_empty() {
            let li = Node::ListItem(list_item_children);
            children.push(li);
        }

        if !is_numbered_list_item(tokens) {
            break;
        }
    }

    Ok((tokens, Node::OrderedList(children)))
}

fn eat_unordered_list<'a>(mut tokens: &'a [Token<'a>]) -> ParserResult<Node> {
    let mut children: Vec<Node> = vec![];

    while !tokens.is_empty() {
        tokens = &tokens[2..]; // hyphen, whitespace

        let (remaining, list_item_children) = eat_to_newline(tokens)?;
        tokens = remaining;

        if !list_item_children.is_empty() {
            let li = Node::ListItem(list_item_children);
            children.push(li);
        }

        if !is_unordered_list_item(tokens) {
            break;
        }
    }

    Ok((tokens, Node::UnorderedList(children)))
}

fn eat_paragraph<'a>(tokens: &'a [Token]) -> ParserResult<'a, Node> {
    let (remaining, children) = eat_to_newline(tokens)?;
    Ok((remaining, Node::Paragraph(children)))
}

fn eat_to_newline<'a>(mut tokens: &'a [Token<'a>]) -> ParserResult<Vec<Node>> {
    let mut nodes: Vec<Node> = vec![];

    while !tokens.is_empty() {
        if is_head(tokens, TokenIdent::Newline) {
            let rest = skip_leading_newlines(tokens)?;
            return Ok((rest, nodes));
        }
        let (rest, tok) = eat_item(tokens)?;
        tokens = rest;
        nodes.push(tok);
    }

    Ok((tokens, nodes))
}

fn eat_item<'a>(tokens: &'a [Token]) -> ParserResult<'a, Node> {
    match tokens[0] {
        Token::Asterisk => eat_matching_pair(tokens, TokenIdent::Asterisk, NodeIdent::Strong),
        Token::BackTick => eat_codeblock(tokens),
        Token::BracketEnd => eat_text_including(tokens),
        Token::BracketStart => eat_bracket_start(tokens),
        Token::Caret => eat_matching_pair(tokens, TokenIdent::Caret, NodeIdent::Highlight),
        Token::DoubleQuote => eat_matching_pair(tokens, TokenIdent::DoubleQuote, NodeIdent::Quotation),
        Token::Hash => eat_text_including(tokens),
        Token::Pipe => eat_pipe(tokens),
        Token::Underscore => eat_matching_pair(tokens, TokenIdent::Underscore, NodeIdent::Underlined),
        _ => eat_text(tokens),
    }
}

fn eat_codeblock<'a>(mut tokens: &'a [Token<'a>]) -> ParserResult<Node> {
    if tokens.len() < 6
        || !is_token_at_index(tokens, 1, TokenIdent::BackTick)
        || !is_token_at_index(tokens, 2, TokenIdent::BackTick)
    {
        return eat_text_including(tokens);
    }

    tokens = &tokens[3..]; // opening backticks

    // if theres a word on the same line as the opening backticks, treat it as the descriptor for the code language
    tokens = skip_leading_whitespace(tokens)?;

    let language: Option<CodeblockLanguage> = if !is_head(tokens, TokenIdent::Newline) {
        // treat this as the language specifier
        let (toks, s) = eat_text_as_string(tokens)?;
        tokens = toks;
        if s == "rust" {
            Some(CodeblockLanguage::Rust)
        } else {
            None
        }
    } else {
        None
    };

    let (toks, code) = eat_string_until(tokens, TokenIdent::BackTick)?;
    // todo: trim the string

    tokens = toks;

    if tokens.len() >= 3
        && is_token_at_index(tokens, 0, TokenIdent::BackTick)
        && is_token_at_index(tokens, 1, TokenIdent::BackTick)
        && is_token_at_index(tokens, 2, TokenIdent::BackTick)
    {
        tokens = &tokens[3..];
    }

    Ok((tokens, Node::Codeblock(language, code)))
}

fn eat_pipe<'a>(mut tokens: &'a [Token<'a>]) -> ParserResult<Node> {
    if is_token_at_index(tokens, 1, TokenIdent::Pipe) {
        // two pipes, treat this as text (e.g. could be part of code snippet)
        eat_text_including(tokens)
    } else if remaining_tokens_contain(tokens, TokenIdent::Pipe) {
        if is_token_at_index(tokens, 1, TokenIdent::Hash) {
            tokens = &tokens[1..]; // eat the opening PIPE,
            let (toks, children) = eat_list_until(tokens, TokenIdent::Pipe)?;
            Ok((toks, Node::Marginnote(children)))
        } else {
            let (toks, children) = eat_list_until(tokens, TokenIdent::Pipe)?;
            Ok((toks, Node::Sidenote(children)))
        }
    } else {
        eat_text_including(tokens)
    }
}

fn eat_matching_pair<'a>(
    tokens: &'a [Token<'a>],
    token_ident: TokenIdent,
    node_ident: NodeIdent,
) -> ParserResult<Node> {
    if remaining_tokens_contain(tokens, token_ident) {
        let (toks, children) = eat_list_until(tokens, token_ident)?;

        let node = match node_ident {
            NodeIdent::Strong => Node::Strong(children),
            NodeIdent::Highlight => Node::Highlight(children),
            NodeIdent::Quotation => Node::Quotation(children),
            NodeIdent::Underlined => Node::Underlined(children),
            _ => return Err(Error::Parser),
        };

        Ok((toks, node))
    } else {
        eat_text_including(tokens)
    }
}

fn eat_bracket_start<'a>(tokens: &'a [Token<'a>]) -> ParserResult<Node> {
    if is_token_at_index(tokens, 1, TokenIdent::BracketStart) {
        eat_link(tokens)
    } else {
        eat_text_including(tokens)
    }
}

fn eat_link<'a>(mut tokens: &'a [Token<'a>]) -> ParserResult<Node> {
    tokens = &tokens[2..];
    let (mut tokens, url) = eat_string_until(tokens, TokenIdent::BracketEnd)?;

    if tokens.len() > 1 {
        // at a a closing bracket, move past it
        tokens = &tokens[1..];

        if is_head(tokens, TokenIdent::BracketEnd) {
            // the url is also the display name
            let children = vec![Node::Text(url.to_string())];

            tokens = &tokens[1..]; // move past the second closing bracket

            return Ok((tokens, Node::Link(url, children)));
        } else if is_head(tokens, TokenIdent::BracketStart) {
            // move past the second opening bracket
            tokens = &tokens[1..];

            let (toks, children) = eat_to_bracket_end(tokens)?;

            tokens = toks;
            tokens = drop_token(tokens, TokenIdent::BracketEnd);
            tokens = drop_token(tokens, TokenIdent::BracketEnd);

            return Ok((tokens, Node::Link(url, children)));
        }
    }

    Err(Error::Parser)
}

fn eat_to_bracket_end<'a>(mut tokens: &'a [Token<'a>]) -> ParserResult<Vec<Node>> {
    let mut nodes: Vec<Node> = vec![];

    while !tokens.is_empty() {
        if is_head(tokens, TokenIdent::BracketEnd) {
            return Ok((tokens, nodes));
        }
        let (rest, tok) = eat_item(tokens)?;
        tokens = rest;
        nodes.push(tok);
    }

    Ok((tokens, nodes))
}

fn remaining_tokens_contain<'a>(tokens: &'a [Token<'a>], token_ident: TokenIdent) -> bool {
    if tokens.len() > 1 {
        let ts = &tokens[1..];
        for t in ts {
            if Into::<TokenIdent>::into(t) == token_ident {
                return true;
            }
        }
    }
    false
}

fn eat_list_until<'a>(mut tokens: &'a [Token<'a>], token_ident: TokenIdent) -> ParserResult<Vec<Node>> {
    let mut res: Vec<Node> = vec![];

    tokens = &tokens[1..]; // shift opening token

    while !tokens.is_empty() && !is_head(tokens, token_ident) {
        let (toks, content) = eat_item(tokens)?;
        res.push(content);
        tokens = toks;
    }

    if !tokens.is_empty() {
        tokens = &tokens[1..]; // shift closing token
    }

    Ok((tokens, res))
}

// treat every token as Text until we get to a token of the given type
fn eat_string_until<'a>(mut tokens: &'a [Token<'a>], token_ident: TokenIdent) -> ParserResult<String> {
    let mut value = "".to_string();

    while !tokens.is_empty() && !is_head(tokens, token_ident) {
        let (toks, s) = eat_token_as_str(tokens)?;
        tokens = toks;
        value += s;
    }

    Ok((tokens, value))
}

// treat the first token as Text and then append any further Text tokens
fn eat_text_including<'a>(tokens: &'a [Token<'a>]) -> ParserResult<Node> {
    let (tokens, s) = eat_token_as_str(tokens)?;
    let (tokens, st) = eat_text_as_string(tokens)?;

    Ok((tokens, Node::Text(s.to_string() + &st)))
}

fn eat_text<'a>(tokens: &'a [Token<'a>]) -> ParserResult<Node> {
    let (tokens, value) = eat_text_as_string(tokens)?;
    Ok((tokens, Node::Text(value)))
}

pub(crate) fn skip_leading_whitespace_and_newlines<'a>(tokens: &'a [Token]) -> Result<&'a [Token<'a>]> {
    for (i, tok) in tokens.iter().enumerate() {
        match tok {
            Token::Whitespace(_) | Token::Newline => (),
            _ => return Ok(&tokens[i..]),
        }
    }

    Ok(&[])
}

pub(crate) fn skip_leading_newlines<'a>(tokens: &'a [Token]) -> Result<&'a [Token<'a>]> {
    skip_leading(tokens, TokenIdent::Newline)
}

fn skip_leading_whitespace<'a>(tokens: &'a [Token]) -> Result<&'a [Token<'a>]> {
    skip_leading(tokens, TokenIdent::Whitespace)
}

fn eat_token_as_str<'a>(tokens: &'a [Token<'a>]) -> Result<(&'a [Token<'a>], &'a str)> {
    Ok((&tokens[1..], get_token_value(&tokens[0])))
}

fn eat_text_as_string<'a>(mut tokens: &'a [Token<'a>]) -> ParserResult<String> {
    let mut value: String = "".to_string();

    while !tokens.is_empty() {
        match tokens[0] {
            Token::Text(s) => value += s,
            Token::Digits(s) => value += s,
            Token::Whitespace(s) => value += s,
            Token::Period => value += ".",
            Token::Hyphen => value += "-",
            _ => return Ok((tokens, value)),
        }
        tokens = &tokens[1..];
    }

    Ok((tokens, value))
}

fn skip_leading<'a>(tokens: &'a [Token], token_ident: TokenIdent) -> Result<&'a [Token<'a>]> {
    for (i, tok) in tokens.iter().enumerate() {
        if Into::<TokenIdent>::into(tok) != token_ident {
            return Ok(&tokens[i..]);
        }
    }

    Ok(&[])
}

fn drop_token<'a>(tokens: &'a [Token<'a>], token_ident: TokenIdent) -> &'a [Token<'a>] {
    if is_head(tokens, token_ident) {
        &tokens[1..]
    } else {
        tokens
    }
}

fn is_head<'a>(tokens: &'a [Token<'a>], token_ident: TokenIdent) -> bool {
    is_token_at_index(tokens, 0, token_ident)
}

fn is_token_at_index<'a>(tokens: &'a [Token<'a>], idx: usize, token_ident: TokenIdent) -> bool {
    tokens.len() > idx && Into::<TokenIdent>::into(&tokens[idx]) == token_ident
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::error::{Error, Result};
    use crate::lexer::tokenize;
    use crate::lexer::{Token, TokenIdent};

    fn build(s: &'static str) -> Vec<Node> {
        let toks = tokenize(s).unwrap();
        parse(toks).unwrap()
    }

    fn ordered_list_children<'a>(node: &'a Node) -> Result<&'a Vec<Node>> {
        match node {
            Node::OrderedList(children) => {
                return Ok(children);
            }
            _ => assert_eq!(false, true),
        };
        Err(Error::Parser)
    }

    fn unordered_list_children<'a>(node: &'a Node) -> Result<&'a Vec<Node>> {
        match node {
            Node::UnorderedList(children) => {
                return Ok(children);
            }
            _ => assert_eq!(false, true),
        };
        Err(Error::Parser)
    }

    fn paragraph_children<'a>(node: &'a Node) -> Result<&'a Vec<Node>> {
        match node {
            Node::Paragraph(children) => {
                return Ok(children);
            }
            _ => assert_eq!(false, true),
        };
        Err(Error::Parser)
    }

    fn highlight_children<'a>(node: &'a Node) -> Result<&'a Vec<Node>> {
        match node {
            Node::Highlight(children) => {
                return Ok(children);
            }
            _ => assert_eq!(false, true),
        };
        Err(Error::Parser)
    }

    fn assert_list_item_text(node: &Node, expected: &'static str) {
        match node {
            Node::ListItem(children) => {
                assert_eq!(children.len(), 1);
                assert_text(&children[0], expected);
            }
            _ => assert_eq!(false, true),
        };
    }

    fn assert_text(node: &Node, expected: &'static str) {
        match node {
            Node::Text(s) => assert_eq!(s, expected),
            _ => assert_eq!(false, true),
        };
    }

    fn assert_strong1(node: &Node, expected: &'static str) {
        match node {
            Node::Strong(ns) => {
                assert_eq!(ns.len(), 1);
                assert_text(&ns[0], expected);
            }
            _ => assert_eq!(false, true),
        };
    }

    fn assert_link(node: &Node, expected_url: &'static str, expected_text: &'static str) {
        match node {
            Node::Link(url, ns) => {
                assert_eq!(url, expected_url);
                assert_eq!(ns.len(), 1);
                assert_text(&ns[0], expected_text);
            }
            _ => assert_eq!(false, true),
        };
    }

    fn assert_underline1(node: &Node, expected: &'static str) {
        match node {
            Node::Underlined(ns) => {
                assert_eq!(ns.len(), 1);
                assert_text(&ns[0], expected);
            }
            _ => assert_eq!(false, true),
        };
    }

    fn assert_highlight1(node: &Node, expected: &'static str) {
        match node {
            Node::Highlight(ns) => {
                assert_eq!(ns.len(), 1);
                assert_text(&ns[0], expected);
            }
            _ => assert_eq!(false, true),
        };
    }

    fn assert_quoted1(node: &Node, expected: &'static str) {
        match node {
            Node::Quotation(ns) => {
                assert_eq!(ns.len(), 1);
                assert_text(&ns[0], expected);
            }
            _ => assert_eq!(false, true),
        };
    }

    #[test]
    fn test_only_text() {
        {
            let nodes = build("simple text only test");

            assert_eq!(1, nodes.len());
            let children = paragraph_children(&nodes[0]).unwrap();
            assert_eq!(children.len(), 1);
            assert_text(&children[0], "simple text only test");
        }

        {
            let nodes = build("more token types 1234.9876 - treat as text");

            assert_eq!(1, nodes.len());
            let children = paragraph_children(&nodes[0]).unwrap();
            assert_eq!(children.len(), 1);
            assert_text(&children[0], "more token types 1234.9876 - treat as text");
        }
    }

    #[test]
    fn test_strong() {
        {
            let nodes = build("words with *emphasis* test");

            assert_eq!(1, nodes.len());
            let children = paragraph_children(&nodes[0]).unwrap();
            assert_eq!(children.len(), 3);
            assert_text(&children[0], "words with ");
            assert_strong1(&children[1], "emphasis");
            assert_text(&children[2], " test");
        }
        {
            let nodes = build("words with *emphasis*");

            assert_eq!(1, nodes.len());
            let children = paragraph_children(&nodes[0]).unwrap();
            assert_eq!(children.len(), 2);
            assert_text(&children[0], "words with ");
            assert_strong1(&children[1], "emphasis");
        }
        {
            let nodes = build("words with * multiply");
            assert_eq!(1, nodes.len());

            let children = paragraph_children(&nodes[0]).unwrap();
            assert_eq!(children.len(), 2);
            assert_text(&children[0], "words with ");
            assert_text(&children[1], "* multiply");
        }
    }

    #[test]
    fn test_underline() {
        {
            let nodes = build("words with _underlined_ test");

            assert_eq!(1, nodes.len());
            let children = paragraph_children(&nodes[0]).unwrap();
            assert_eq!(children.len(), 3);
            assert_text(&children[0], "words with ");
            assert_underline1(&children[1], "underlined");
            assert_text(&children[2], " test");
        }
        {
            let nodes = build("words with _underlines_");

            assert_eq!(1, nodes.len());
            let children = paragraph_children(&nodes[0]).unwrap();
            assert_eq!(children.len(), 2);
            assert_text(&children[0], "words with ");
            assert_underline1(&children[1], "underlines");
        }
        {
            let nodes = build("sentence with _ underscore");
            assert_eq!(1, nodes.len());

            let children = paragraph_children(&nodes[0]).unwrap();
            assert_eq!(children.len(), 2);
            assert_text(&children[0], "sentence with ");
            assert_text(&children[1], "_ underscore");
        }
    }

    #[test]
    fn test_highlight() {
        {
            let nodes = build("words with ^highlighted^ test");

            assert_eq!(1, nodes.len());
            let children = paragraph_children(&nodes[0]).unwrap();
            assert_eq!(children.len(), 3);
            assert_text(&children[0], "words with ");
            assert_highlight1(&children[1], "highlighted");
            assert_text(&children[2], " test");
        }
        {
            let nodes = build("words with ^highlight^");

            assert_eq!(1, nodes.len());
            let children = paragraph_children(&nodes[0]).unwrap();
            assert_eq!(children.len(), 2);
            assert_text(&children[0], "words with ");
            assert_highlight1(&children[1], "highlight");
        }
        {
            let nodes = build("words with ^ exponent");
            assert_eq!(1, nodes.len());

            let children = paragraph_children(&nodes[0]).unwrap();
            assert_eq!(children.len(), 2);
            assert_text(&children[0], "words with ");
            assert_text(&children[1], "^ exponent");
        }
    }

    #[test]
    fn test_quotes() {
        {
            let nodes = build("words with \"quoted\" text");

            assert_eq!(1, nodes.len());
            let children = paragraph_children(&nodes[0]).unwrap();
            assert_eq!(children.len(), 3);
            assert_text(&children[0], "words with ");
            assert_quoted1(&children[1], "quoted");
            assert_text(&children[2], " text");
        }
        {
            let nodes = build("sentence ending with \"quotation\"");

            assert_eq!(1, nodes.len());
            let children = paragraph_children(&nodes[0]).unwrap();
            assert_eq!(children.len(), 2);
            assert_text(&children[0], "sentence ending with ");
            assert_quoted1(&children[1], "quotation");
        }
        {
            let nodes = build("sentence with random \" double quote character");
            assert_eq!(1, nodes.len());

            let children = paragraph_children(&nodes[0]).unwrap();
            assert_eq!(children.len(), 2);
            assert_text(&children[0], "sentence with random ");
            assert_text(&children[1], "\" double quote character");
        }
    }

    #[test]
    fn test_nested_markup() {
        let nodes = build("^*words* with *strong*^ test");

        assert_eq!(1, nodes.len());
        let children = paragraph_children(&nodes[0]).unwrap();
        dbg!(&children);
        assert_eq!(children.len(), 2);

        let highlighted = highlight_children(&children[0]).unwrap();
        assert_eq!(highlighted.len(), 3);
        assert_strong1(&highlighted[0], "words");
        assert_text(&highlighted[1], " with ");
        assert_strong1(&highlighted[2], "strong");
        assert_text(&children[1], " test");
    }

    #[test]
    fn test_links() {
        {
            let nodes = build("here is [[a link]] foo");

            assert_eq!(1, nodes.len());
            let children = paragraph_children(&nodes[0]).unwrap();
            assert_eq!(children.len(), 3);
            assert_text(&children[0], "here is ");
            assert_link(&children[1], "a link", "a link");
            assert_text(&children[2], " foo");
        }
        {
            let nodes = build("here is [[a link]]");

            assert_eq!(1, nodes.len());
            let children = paragraph_children(&nodes[0]).unwrap();
            assert_eq!(children.len(), 2);
            assert_text(&children[0], "here is ");
            assert_link(&children[1], "a link", "a link");
        }
        {
            let nodes = build("here is [[https://indy.io][a link]] foo");

            assert_eq!(1, nodes.len());
            let children = paragraph_children(&nodes[0]).unwrap();
            assert_eq!(children.len(), 3);
            assert_text(&children[0], "here is ");
            assert_link(&children[1], "https://indy.io", "a link");
            assert_text(&children[2], " foo");
        }
        {
            let nodes = build("here is [[https://indy.io][a link]]");

            assert_eq!(1, nodes.len());
            let children = paragraph_children(&nodes[0]).unwrap();
            assert_eq!(children.len(), 2);
            assert_text(&children[0], "here is ");
            assert_link(&children[1], "https://indy.io", "a link");
        }
        {
            let nodes = build("here is [[https://indy.io][to a *bold* link]]");

            assert_eq!(1, nodes.len());
            let children = paragraph_children(&nodes[0]).unwrap();
            assert_eq!(children.len(), 2);
            assert_text(&children[0], "here is ");
            match &children[1] {
                Node::Link(url, ns) => {
                    assert_eq!(url, "https://indy.io");
                    assert_eq!(ns.len(), 3);
                    assert_text(&ns[0], "to a ");
                    assert_strong1(&ns[1], "bold");
                    assert_text(&ns[2], " link");
                }
                _ => assert_eq!(false, true),
            };
        }
    }

    #[test]
    fn test_multiline() {
        let nodes = build(
            "this

is
multiline",
        );
        assert_eq!(3, nodes.len());

        let mut children = paragraph_children(&nodes[0]).unwrap();
        assert_eq!(children.len(), 1);
        assert_text(&children[0], "this");

        children = paragraph_children(&nodes[1]).unwrap();
        assert_eq!(children.len(), 1);
        assert_text(&children[0], "is");

        children = paragraph_children(&nodes[2]).unwrap();
        assert_eq!(children.len(), 1);
        assert_text(&children[0], "multiline");
    }

    #[test]
    fn test_ul() {
        {
            let nodes = build(
                "- unordered item 1
- unordered item 2
- unordered item 3",
            );
            assert_eq!(1, nodes.len());

            let children = unordered_list_children(&nodes[0]).unwrap();
            assert_eq!(children.len(), 3);
            assert_list_item_text(&children[0], "unordered item 1");
            assert_list_item_text(&children[1], "unordered item 2");
            assert_list_item_text(&children[2], "unordered item 3");
        }
    }

    #[test]
    fn test_ol() {
        {
            let nodes = build(
                "1. this is a list item in an ordered list
2. here's another
3. and a third",
            );
            assert_eq!(1, nodes.len());

            let children = ordered_list_children(&nodes[0]).unwrap();
            assert_eq!(children.len(), 3);
            assert_list_item_text(&children[0], "this is a list item in an ordered list");
            assert_list_item_text(&children[1], "here's another");
            assert_list_item_text(&children[2], "and a third");
        }
        {
            let nodes = build(
                "21. twenty first item
22. twenty second item",
            );
            assert_eq!(1, nodes.len());

            let children = ordered_list_children(&nodes[0]).unwrap();
            assert_eq!(children.len(), 2);
            assert_list_item_text(&children[0], "twenty first item");
            assert_list_item_text(&children[1], "twenty second item");
        }
        {
            let nodes = build(
                "1. 5 gold rings
2. 4 something somethings",
            );
            assert_eq!(1, nodes.len());

            let children = ordered_list_children(&nodes[0]).unwrap();
            assert_eq!(children.len(), 2);
            assert_list_item_text(&children[0], "5 gold rings");
            assert_list_item_text(&children[1], "4 something somethings");
        }
    }

    #[test]
    fn test_multiple_containers() {
        let nodes = build(
            "this is the 1st paragraph
- item a
- item b
- item c
here is the closing paragraph",
        );
        assert_eq!(3, nodes.len());

        let mut children = paragraph_children(&nodes[0]).unwrap();
        assert_eq!(children.len(), 1);
        assert_text(&children[0], "this is the 1st paragraph");

        children = unordered_list_children(&nodes[1]).unwrap();
        assert_eq!(children.len(), 3);
        assert_list_item_text(&children[0], "item a");
        assert_list_item_text(&children[1], "item b");
        assert_list_item_text(&children[2], "item c");

        children = paragraph_children(&nodes[2]).unwrap();
        assert_eq!(children.len(), 1);
        assert_text(&children[0], "here is the closing paragraph");
    }

    #[test]
    fn test_hyphen_around_quotation() {
        let nodes = build("Though Aristotle wrote many elegant treatises and dialogues - Cicero described his literary style as \"a river of gold\" - it is thought that only around a third of his original output has survived.");

        assert_eq!(1, nodes.len());
        let children = paragraph_children(&nodes[0]).unwrap();
        assert_eq!(children.len(), 3);

        assert_text(
            &children[0],
            "Though Aristotle wrote many elegant treatises and dialogues - Cicero described his literary style as ",
        );
        assert_quoted1(&children[1], "a river of gold");
        assert_text(
            &children[2],
            " - it is thought that only around a third of his original output has survived.",
        );
    }

    #[test]
    fn test_square_bracket_in_normal_text() {
        let nodes = build("on account of the certitude and evidence of [its] reasoning");

        assert_eq!(1, nodes.len());
        let children = paragraph_children(&nodes[0]).unwrap();
        assert_eq!(children.len(), 3);

        assert_text(&children[0], "on account of the certitude and evidence of ");
        assert_text(&children[1], "[its");
        assert_text(&children[2], "] reasoning");
    }

    #[test]
    fn test_text_beginning_with_number() {
        let nodes = build("12 monkeys");
        assert_eq!(1, nodes.len());

        let children = paragraph_children(&nodes[0]).unwrap();
        assert_eq!(children.len(), 1);
        assert_text(&children[0], "12 monkeys");
    }

    #[test]
    fn test_remaining_tokens_contain() {
        let toks = vec![Token::Asterisk, Token::Asterisk];
        assert_eq!(remaining_tokens_contain(&toks, TokenIdent::Asterisk), true);

        let toks2 = vec![Token::Asterisk, Token::Pipe];
        assert_eq!(remaining_tokens_contain(&toks2, TokenIdent::Asterisk), false);

        let toks3 = vec![Token::Asterisk];
        assert_eq!(remaining_tokens_contain(&toks3, TokenIdent::Asterisk), false);
    }

    #[test]
    fn test_skip_leading_whitespace_and_newlines() {
        let mut toks = tokenize("foo [bar]").unwrap();
        let mut res = skip_leading_whitespace_and_newlines(&toks).unwrap();
        assert_eq!(4, res.len());

        toks = tokenize("    foo [bar]").unwrap();
        res = skip_leading_whitespace_and_newlines(&toks).unwrap();
        assert_eq!(4, res.len());
    }
}
