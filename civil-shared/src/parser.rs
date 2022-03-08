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
use crate::lexer::{get_token_pos, get_token_value, split_tokens_at, Token, TokenIdent};
use serde_derive::Serialize;
use strum_macros::EnumDiscriminants;

// a result type that returns a tuple of the remaining tokens as well as the given return value
pub type ParserResult<'a, T> = Result<(&'a [Token<'a>], T)>;

#[derive(Debug, Serialize, PartialEq, Eq)]
pub enum CodeblockLanguage {
    Rust,
}

// NOTE: update the node check in www/js/index.js to reflect this enum
//
#[derive(Debug, Serialize, EnumDiscriminants)]
#[strum_discriminants(name(NodeIdent))]
pub enum Node {
    BlockQuote(usize, Vec<Node>),
    Codeblock(usize, Option<CodeblockLanguage>, String),
    Header(usize, u32, Vec<Node>),
    Highlight(usize, Vec<Node>),
    HorizontalRule(usize),
    Image(usize, String),
    ListItem(usize, Vec<Node>),
    MarginDisagree(usize, Vec<Node>),
    MarginScribble(usize, Vec<Node>),
    MarginText(usize, bool, Vec<Node>),
    OrderedList(usize, Vec<Node>, String),
    Paragraph(usize, Vec<Node>),
    Quotation(usize, Vec<Node>),
    Strong(usize, Vec<Node>),
    Text(usize, String),
    Underlined(usize, Vec<Node>),
    UnorderedList(usize, Vec<Node>),
    Url(usize, String, Vec<Node>),
}

fn get_node_pos(node: &Node) -> usize {
    match node {
        Node::BlockQuote(pos, _) => *pos,
        Node::Codeblock(pos, _, _) => *pos,
        Node::Header(pos, _, _) => *pos,
        Node::Highlight(pos, _) => *pos,
        Node::HorizontalRule(pos) => *pos,
        Node::Image(pos, _) => *pos,
        Node::ListItem(pos, _) => *pos,
        Node::MarginDisagree(pos, _) => *pos,
        Node::MarginScribble(pos, _) => *pos,
        Node::MarginText(pos, _, _) => *pos,
        Node::OrderedList(pos, _, _) => *pos,
        Node::Paragraph(pos, _) => *pos,
        Node::Quotation(pos, _) => *pos,
        Node::Strong(pos, _) => *pos,
        Node::Text(pos, _) => *pos,
        Node::Underlined(pos, _) => *pos,
        Node::UnorderedList(pos, _) => *pos,
        Node::Url(pos, _, _) => *pos,
    }
}

fn is_numbered_list_item(tokens: &'_ [Token]) -> bool {
    is_token_at_index(tokens, 0, TokenIdent::Digits)
        && is_token_at_index(tokens, 1, TokenIdent::Period)
        && is_token_at_index(tokens, 2, TokenIdent::Whitespace)
}

fn is_unordered_list_item(tokens: &'_ [Token]) -> bool {
    is_token_at_index(tokens, 0, TokenIdent::Hyphen) && is_token_at_index(tokens, 1, TokenIdent::Whitespace)
}

fn is_codeblock(tokens: &'_ [Token]) -> bool {
    let len = tokens.len();
    is_token_at_index(tokens, 0, TokenIdent::BackTick)
        && is_token_at_index(tokens, 1, TokenIdent::BackTick)
        && is_token_at_index(tokens, 2, TokenIdent::BackTick)
        && is_token_at_index(tokens, len - 3, TokenIdent::BackTick)
        && is_token_at_index(tokens, len - 2, TokenIdent::BackTick)
        && is_token_at_index(tokens, len - 1, TokenIdent::BackTick)
}

fn is_horizontal_rule(tokens: &'_ [Token]) -> bool {
    is_token_at_index(tokens, 0, TokenIdent::Hash)
        && is_token_at_index(tokens, 1, TokenIdent::Hyphen)
        && (is_token_at_index(tokens, 2, TokenIdent::EOS)
            || is_token_at_index(tokens, 2, TokenIdent::Whitespace)
            || is_token_at_index(tokens, 2, TokenIdent::Newline))
}

/// returns a tuple of 'heading level' and 'text content'
fn heading_text<'a>(s: &'a str) -> Option<(u32, &'a str)> {
    if let Some(a) = s.strip_prefix("h1 ") {
        Some((1, a))
    } else if let Some(a) = s.strip_prefix("h2 ") {
        Some((2, a))
    } else if let Some(a) = s.strip_prefix("h3 ") {
        Some((3, a))
    } else if let Some(a) = s.strip_prefix("h4 ") {
        Some((4, a))
    } else if let Some(a) = s.strip_prefix("h5 ") {
        Some((5, a))
    } else if let Some(a) = s.strip_prefix("h6 ") {
        Some((6, a))
    } else if let Some(a) = s.strip_prefix("h7 ") {
        Some((7, a))
    } else if let Some(a) = s.strip_prefix("h8 ") {
        Some((8, a))
    } else if let Some(a) = s.strip_prefix("h9 ") {
        Some((9, a))
    } else {
        None
    }
}

fn is_heading(tokens: &'_ [Token]) -> bool {
    if is_token_at_index(tokens, 0, TokenIdent::Hash) && is_token_at_index(tokens, 1, TokenIdent::Text) {
        match tokens[1] {
            Token::Text(_, s) => {
                if let Some((_level, h)) = heading_text(s) {
                    h.len() > 0
                } else {
                    false
                }
            }
            _ => false,
        }
    } else {
        false
    }
}

fn is_img(tokens: &'_ [Token]) -> bool {
    is_at_specifier(tokens) && is_text_at_index(tokens, 1, "img")
}

fn is_blockquote_start<'a>(tokens: &'a [Token<'a>]) -> bool {
    is_token_at_index(tokens, 0, TokenIdent::BlockquoteBegin)
}

// need: parse until a terminator token (EOS, BlockquoteEnd) is reached
//
pub fn parse<'a>(tokens: &'a [Token<'a>]) -> ParserResult<Vec<Node>> {
    let mut tokens: &[Token] = &tokens;
    let mut res = Vec::new();

    tokens = skip_leading_whitespace_and_newlines(&tokens)?;
    while !tokens.is_empty() && !is_terminator(tokens) {
        tokens = skip_leading_whitespace_and_newlines(&tokens)?;

        let (rem, node) = if is_numbered_list_item(tokens) {
            eat_ordered_list(tokens, None)?
        } else if is_unordered_list_item(tokens) {
            eat_unordered_list(tokens, None)?
        } else if is_codeblock(tokens) {
            eat_codeblock(tokens)?
        } else if is_horizontal_rule(tokens) {
            eat_hash(tokens)?
        } else if is_heading(tokens) {
            eat_hash(tokens)?
        } else if is_img(tokens) {
            eat_img(tokens)?
        } else if is_blockquote_start(tokens) {
            eat_blockquote(tokens)?
        } else {
            // by default a lot of stuff will get wrapped in a paragraph
            eat_paragraph(tokens)?
        };

        res.push(node);
        tokens = rem;
    }

    Ok((tokens, res))
}

fn eat_ordered_list<'a>(mut tokens: &'a [Token<'a>], halt_at: Option<TokenIdent>) -> ParserResult<Node> {
    let mut children: Vec<Node> = vec![];

    // tokens should be at a digit, this is the starting number for the ordered list
    let starts: String;
    match tokens[0] {
        Token::Digits(_, s) => starts = s.to_string(),
        _ => return Err(Error::Parser),
    }

    let ordered_list_pos = get_token_pos(&tokens[0]);

    while !tokens.is_empty() && !is_head_option(tokens, halt_at) {
        tokens = &tokens[3..]; // digits, period, whitespace

        let (remaining, list_item_children) = eat_to_newline(tokens, halt_at)?;
        tokens = remaining;

        if !list_item_children.is_empty() {
            let li = Node::ListItem(get_node_pos(&list_item_children[0]), list_item_children);
            children.push(li);
        }

        if !is_numbered_list_item(tokens) {
            break;
        }
    }

    Ok((tokens, Node::OrderedList(ordered_list_pos, children, starts)))
}

fn eat_unordered_list<'a>(mut tokens: &'a [Token<'a>], halt_at: Option<TokenIdent>) -> ParserResult<Node> {
    let mut children: Vec<Node> = vec![];

    let unordered_list_pos = get_token_pos(&tokens[0]);

    while !tokens.is_empty() && !is_head_option(tokens, halt_at) {
        tokens = &tokens[2..]; // hyphen, whitespace

        let (remaining, list_item_children) = eat_to_newline(tokens, halt_at)?;
        tokens = remaining;

        if !list_item_children.is_empty() {
            let li = Node::ListItem(get_node_pos(&list_item_children[0]), list_item_children);
            children.push(li);
        }

        if !is_unordered_list_item(tokens) {
            break;
        }
    }

    Ok((tokens, Node::UnorderedList(unordered_list_pos, children)))
}

fn eat_paragraph<'a>(tokens: &'a [Token]) -> ParserResult<'a, Node> {
    let (remaining, children) = eat_to_newline(tokens, None)?;
    Ok((remaining, Node::Paragraph(get_node_pos(&children[0]), children)))
}

fn eat_to_newline<'a>(mut tokens: &'a [Token<'a>], halt_at: Option<TokenIdent>) -> ParserResult<Vec<Node>> {
    let mut nodes: Vec<Node> = vec![];

    while !tokens.is_empty() && !is_head_option(tokens, halt_at) && !is_terminator(tokens) {
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

fn inside_pair<'a>(tokens: &'a [Token]) -> ParserResult<'a, Vec<Node>> {
    // derive the tokenIdent from the first token
    let ident = Into::<TokenIdent>::into(&tokens[0]);

    let (within, outside) = split_tokens_at(&tokens[1..], ident)?;

    let (remaining, within_nodes) = parse(within)?;
    if !remaining.is_empty() {
        // parse is unable to process all the content within the pair
        return Err(Error::Parser);
    }

    Ok((outside, within_nodes))
}

fn eat_item<'a>(tokens: &'a [Token]) -> ParserResult<'a, Node> {
    match tokens[0] {
        Token::At(_) => eat_at(tokens),
        Token::Asterisk(pos) => {
            if let Ok((toks, inside)) = inside_pair(tokens) {
                Ok((toks, Node::Strong(pos, inside)))
            } else {
                eat_text_including(tokens)
            }
        }
        Token::BackTick(_) => eat_codeblock(tokens),
        Token::BracketBegin(_) => eat_text_including(tokens),
        Token::BracketEnd(_) => eat_text_including(tokens),
        Token::Caret(pos) => {
            if let Ok((toks, inside)) = inside_pair(tokens) {
                Ok((toks, Node::Highlight(pos, inside)))
            } else {
                eat_text_including(tokens)
            }
        }
        Token::DoubleQuote(pos) => {
            if let Ok((toks, inside)) = inside_pair(tokens) {
                Ok((toks, Node::Quotation(pos, inside)))
            } else {
                eat_text_including(tokens)
            }
        }
        Token::Hash(_) => eat_hash(tokens),
        Token::Pipe(_) => eat_pipe(tokens),
        Token::Underscore(pos) => {
            if let Ok((toks, inside)) = inside_pair(tokens) {
                Ok((toks, Node::Underlined(pos, inside)))
            } else {
                eat_text_including(tokens)
            }
        }
        _ => eat_text(tokens),
    }
}

fn eat_img<'a>(tokens: &'a [Token<'a>]) -> ParserResult<Node> {
    let pos = get_token_pos(&tokens[0]);
    let (tokens, (image_name, _description)) = eat_as_resource_description_pair(tokens)?;
    return Ok((tokens, Node::Image(pos, image_name.to_string())));
}

fn eat_url<'a>(tokens: &'a [Token<'a>]) -> ParserResult<Node> {
    let pos = get_token_pos(&tokens[0]);
    let (tokens, (url, description)) = eat_as_resource_description_pair(tokens)?;
    return Ok((tokens, Node::Url(pos, url.to_string(), description)));
}

fn eat_hash<'a>(mut tokens: &'a [Token<'a>]) -> ParserResult<Node> {
    // Hash, Hyphen, Whitespace, (Text), EOS | EOL
    // "#- this text is following a horizontal line"

    // Hash, 'h', Whitespace, (Text), EOS | EOL
    // "#h this is a heading"

    let pos = get_token_pos(&tokens[0]);
    if is_token_at_index(tokens, 1, TokenIdent::Hyphen) {
        if is_token_at_index(tokens, 2, TokenIdent::EOS)
            || is_token_at_index(tokens, 2, TokenIdent::Whitespace)
            || is_token_at_index(tokens, 2, TokenIdent::Newline)
        {
            tokens = &tokens[3..];
        } else {
            tokens = &tokens[2..];
        }
        Ok((tokens, Node::HorizontalRule(pos)))
    } else if is_token_at_index(tokens, 1, TokenIdent::Text) {
        match tokens[1] {
            Token::Text(text_pos, s) => {
                if let Some((level, h)) = heading_text(s) {
                    let mut header_children = vec![Node::Text(text_pos, h.to_string())];
                    tokens = &tokens[2..];

                    // if the header markup contained something like:
                    //
                    // #h this is a heading (with a parens)
                    //
                    // then header children would be [Node::Text("this is a heading ")]
                    // and we still need to parse the "(with a parens)"
                    //
                    let (toks, mut other_nodes) = eat_to_newline(tokens, None)?;
                    header_children.append(&mut other_nodes);

                    Ok((toks, Node::Header(pos, level, header_children)))
                } else {
                    eat_text_including(tokens)
                }
            }
            _ => Err(Error::Parser),
        }
    } else {
        eat_text_including(tokens)
    }
}

fn eat_codeblock<'a>(mut tokens: &'a [Token<'a>]) -> ParserResult<Node> {
    if tokens.len() < 6
        || !is_token_at_index(tokens, 1, TokenIdent::BackTick)
        || !is_token_at_index(tokens, 2, TokenIdent::BackTick)
    {
        return eat_text_including(tokens);
    }

    let pos = get_token_pos(&tokens[0]);

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

    let (toks, code) = eat_string(tokens, TokenIdent::BackTick)?;
    // todo: trim the string

    tokens = toks;

    if tokens.len() >= 3
        && is_token_at_index(tokens, 0, TokenIdent::BackTick)
        && is_token_at_index(tokens, 1, TokenIdent::BackTick)
        && is_token_at_index(tokens, 2, TokenIdent::BackTick)
    {
        tokens = &tokens[3..];
    }

    Ok((tokens, Node::Codeblock(pos, language, code)))
}

fn parse_pipe_content<'a>(tokens: &'a [Token<'a>]) -> ParserResult<Vec<Node>> {
    let (within_pipe, outside_pipe) = split_tokens_at(tokens, TokenIdent::Pipe)?;
    let (remaining, within_pipe_nodes) = parse(within_pipe)?;
    if !remaining.is_empty() {
        // parse is unable to process all the pipe content
        return Err(Error::Parser);
    }
    Ok((outside_pipe, within_pipe_nodes))
}

fn eat_pipe<'a>(mut tokens: &'a [Token<'a>]) -> ParserResult<Node> {
    if is_token_at_index(tokens, 1, TokenIdent::Pipe) {
        // two pipes, treat this as text (e.g. could be part of code snippet)
        eat_text_including(tokens)
    } else if remaining_tokens_contain(tokens, TokenIdent::Pipe) {
        let pos = get_token_pos(&tokens[0]);

        if is_token_at_index(tokens, 1, TokenIdent::Hash) {
            if is_token_at_index(tokens, 2, TokenIdent::Hash) {
                tokens = &tokens[3..]; // eat the opening PIPE and the two HASH tokens,
                tokens = skip_leading_whitespace(tokens)?;

                let (tokens, within_pipe_nodes) = parse_pipe_content(tokens)?;

                Ok((tokens, Node::MarginDisagree(pos, within_pipe_nodes)))
            } else {
                tokens = &tokens[2..]; // eat the opening PIPE and HASH,
                tokens = skip_leading_whitespace(tokens)?;

                let (tokens, within_pipe_nodes) = parse_pipe_content(tokens)?;

                Ok((tokens, Node::MarginScribble(pos, within_pipe_nodes)))
            }
        } else if is_token_at_index(tokens, 1, TokenIdent::Tilde) {
            tokens = &tokens[2..]; // eat the opening PIPE and TILDE,
            tokens = skip_leading_whitespace(tokens)?;

            let (tokens, within_pipe_nodes) = parse_pipe_content(tokens)?;

            Ok((tokens, Node::MarginText(pos, false, within_pipe_nodes)))
        } else {
            tokens = &tokens[1..]; // eat the opening PIPE
            tokens = skip_leading_whitespace(tokens)?;

            let (tokens, within_pipe_nodes) = parse_pipe_content(tokens)?;

            Ok((tokens, Node::MarginText(pos, true, within_pipe_nodes)))
        }
    } else {
        eat_text_including(tokens)
    }
}

fn is_at_specifier<'a>(tokens: &'a [Token<'a>]) -> bool {
    is_token_at_index(tokens, 0, TokenIdent::At)
        && is_token_at_index(tokens, 1, TokenIdent::Text)
        && is_token_at_index(tokens, 2, TokenIdent::ParenBegin)
}

fn split_text_token_at_whitespace<'a>(text_token: Token<'a>) -> Result<(Token<'a>, Option<Token<'a>>)> {
    match text_token {
        Token::Text(p, s) => {
            let tokens: Vec<Token<'a>> = s.split_whitespace().map(|chars| Token::Text(p, chars)).collect();
            let t = &tokens[0];
            match t {
                Token::Text(p, u) => {
                    if let Some(remaining_text) = s.strip_prefix(u) {
                        if remaining_text.len() > 0 {
                            let rhs = Token::Text(p + u.len(), remaining_text.trim_start());
                            Ok((*t, Some(rhs)))
                        } else {
                            Ok((*t, None))
                        }
                    } else {
                        Ok((*t, None))
                    }
                }
                _ => Err(Error::Parser),
            }
        }
        _ => Err(Error::Parser),
    }
}

// treat every token as Text until we get to a token of the given type
fn eat_as_resource_description_pair<'a>(mut tokens: &'a [Token<'a>]) -> ParserResult<(String, Vec<Node>)> {
    let mut found_url_desc_divide = false;
    let mut url_tokens: Vec<Token> = vec![];
    let mut desc_tokens: Vec<Token> = vec![];

    let mut paren_balancer = 1;

    tokens = &tokens[3..]; // eat the '@img(' or '@url('

    while !tokens.is_empty() {
        if is_head(tokens, TokenIdent::ParenBegin) {
            let pos = get_token_pos(&tokens[0]);
            paren_balancer += 1;
            tokens = &tokens[1..];
            if found_url_desc_divide {
                desc_tokens.push(Token::ParenBegin(pos));
            } else {
                url_tokens.push(Token::ParenBegin(pos));
            }
        } else if is_head(tokens, TokenIdent::ParenEnd) {
            paren_balancer -= 1;
            let pos = get_token_pos(&tokens[0]);
            tokens = &tokens[1..];

            if paren_balancer == 0 {
                // reached the closing paren
                break;
            }
            if found_url_desc_divide {
                desc_tokens.push(Token::ParenEnd(pos));
            } else {
                url_tokens.push(Token::ParenEnd(pos));
            }
        } else if is_head(tokens, TokenIdent::Text) && !found_url_desc_divide {
            let (first_text_token, maybe_other_text_token) = split_text_token_at_whitespace(tokens[0])?;

            url_tokens.push(first_text_token);
            if let Some(maybe) = maybe_other_text_token {
                found_url_desc_divide = true;
                desc_tokens.push(maybe);
            }
            tokens = &tokens[1..];
        } else {
            if found_url_desc_divide {
                desc_tokens.push(tokens[0]);
            } else {
                url_tokens.push(tokens[0]);
            }
            tokens = &tokens[1..];
        }
    }

    let mut res = String::from("");
    for t in &url_tokens {
        res.push_str(get_token_value(&t));
    }

    let (_rem, description_nodes) = if found_url_desc_divide {
        parse(&desc_tokens)?
    } else {
        parse(&url_tokens)?
    };
    Ok((tokens, (res, description_nodes)))
}

fn eat_blockquote<'a>(mut tokens: &'a [Token<'a>]) -> ParserResult<Node> {
    let pos = get_token_pos(&tokens[0]);

    tokens = &tokens[1..]; // skip past the BlockquoteBegin token

    let (remaining, nodes) = parse(tokens)?;

    let remaining = &remaining[1..]; // skip past the BlockquoteEnd token

    let rem = skip_leading_whitespace_and_newlines(&remaining)?;

    Ok((&rem, Node::BlockQuote(pos, nodes)))
}

fn eat_at<'a>(tokens: &'a [Token<'a>]) -> ParserResult<Node> {
    if is_at_specifier(tokens) {
        match tokens[1] {
            Token::Text(_, "img") => return eat_img(tokens),
            Token::Text(_, "url") => return eat_url(tokens),
            _ => (),
        }
    }

    eat_text_including(tokens)
}

// ignores the first token
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

// treat every token as Text until we get to a token of the given type
fn eat_string<'a>(mut tokens: &'a [Token<'a>], halt_at: TokenIdent) -> ParserResult<String> {
    let mut value = "".to_string();

    while !tokens.is_empty() && !is_head(tokens, halt_at) {
        let (toks, s) = eat_token_as_str(tokens)?;
        tokens = toks;
        value += s;
    }

    Ok((tokens, value))
}

// treat the first token as Text and then append any further Text tokens
fn eat_text_including<'a>(tokens: &'a [Token<'a>]) -> ParserResult<Node> {
    let pos = get_token_pos(&tokens[0]);
    let (tokens, s) = eat_token_as_str(tokens)?;
    let (tokens, st) = eat_text_as_string(tokens)?;

    Ok((tokens, Node::Text(pos, s.to_string() + &st)))
}

fn eat_text<'a>(tokens: &'a [Token<'a>]) -> ParserResult<Node> {
    let pos = get_token_pos(&tokens[0]);
    let (tokens, value) = eat_text_as_string(tokens)?;
    Ok((tokens, Node::Text(pos, value)))
}

fn skip_leading_whitespace_and_newlines<'a>(tokens: &'a [Token]) -> Result<&'a [Token<'a>]> {
    for (i, tok) in tokens.iter().enumerate() {
        match tok {
            Token::Whitespace(_, _) | Token::Newline(_) => (),
            _ => return Ok(&tokens[i..]),
        }
    }

    Ok(&[])
}

fn skip_leading_newlines<'a>(tokens: &'a [Token]) -> Result<&'a [Token<'a>]> {
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
            Token::Text(_, s) => value += s,
            Token::Digits(_, s) => value += s,
            Token::Whitespace(_, s) => value += s,
            // Token::GreaterThan => value += ">",
            // Token::LessThan => value += "<",
            Token::Tilde(_) => value += "~",
            Token::Period(_) => value += ".",
            Token::Hyphen(_) => value += "-",
            //            Token::At => value += "@",
            Token::ParenBegin(_) => value += "(",
            Token::ParenEnd(_) => value += ")",
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

fn is_terminator<'a>(tokens: &'a [Token<'a>]) -> bool {
    is_token_at_index(tokens, 0, TokenIdent::EOS) || is_token_at_index(tokens, 0, TokenIdent::BlockquoteEnd)
}

fn is_head<'a>(tokens: &'a [Token<'a>], token_ident: TokenIdent) -> bool {
    is_token_at_index(tokens, 0, token_ident)
}

fn is_head_option<'a>(tokens: &'a [Token<'a>], token_ident: Option<TokenIdent>) -> bool {
    if let Some(ident) = token_ident {
        is_token_at_index(tokens, 0, ident)
    } else {
        false
    }
}

fn is_token_at_index<'a>(tokens: &'a [Token<'a>], idx: usize, token_ident: TokenIdent) -> bool {
    tokens.len() > idx && Into::<TokenIdent>::into(&tokens[idx]) == token_ident
}

fn is_text_at_index<'a>(tokens: &'a [Token<'a>], idx: usize, text: &str) -> bool {
    if is_token_at_index(tokens, idx, TokenIdent::Text) {
        if let Token::Text(_, s) = tokens[idx] {
            return s == text;
        }
    }
    false
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::error::{Error, Result};
    use crate::lexer::tokenize;
    use crate::lexer::{Token, TokenIdent};

    fn build(s: &'static str) -> Vec<Node> {
        let toks = tokenize(s).unwrap();
        let (_, res) = parse(&toks).unwrap();
        res
    }

    #[test]
    fn test_is_horizontal_rule() {
        {
            let toks = tokenize("#- ").unwrap();
            assert_eq!(is_horizontal_rule(&toks), true);
        }
        {
            let toks = tokenize("#-").unwrap();
            assert_eq!(is_horizontal_rule(&toks), true);
        }
    }

    #[test]
    fn test_is_img() {
        {
            let toks = tokenize("@img(foo.jpeg)").unwrap();
            dbg!(&toks);
            assert_eq!(is_img(&toks), true);
        }
        {
            let toks = tokenize("@img").unwrap();
            dbg!(&toks);
            assert_eq!(is_img(&toks), false);
        }
    }

    fn ordered_list_children<'a>(node: &'a Node, expected_starts: &str) -> Result<&'a Vec<Node>> {
        match node {
            Node::OrderedList(_, children, starts) => {
                assert_eq!(starts, &expected_starts);

                return Ok(children);
            }
            _ => assert_eq!(false, true),
        };
        Err(Error::Parser)
    }

    fn unordered_list_children<'a>(node: &'a Node) -> Result<&'a Vec<Node>> {
        match node {
            Node::UnorderedList(_, children) => {
                return Ok(children);
            }
            _ => assert_eq!(false, true),
        };
        Err(Error::Parser)
    }

    fn paragraph_children<'a>(node: &'a Node) -> Result<&'a Vec<Node>> {
        match node {
            Node::Paragraph(_, children) => {
                return Ok(children);
            }
            _ => assert_eq!(false, true),
        };
        Err(Error::Parser)
    }

    fn blockquote_children<'a>(node: &'a Node) -> Result<&'a Vec<Node>> {
        match node {
            Node::BlockQuote(_, children) => {
                return Ok(children);
            }
            _ => assert_eq!(false, true),
        };
        Err(Error::Parser)
    }

    fn assert_list_item_text(node: &Node, expected: &'static str) {
        match node {
            Node::ListItem(_, children) => {
                assert_eq!(children.len(), 1);
                assert_text(&children[0], expected);
            }
            _ => assert_eq!(false, true),
        };
    }

    fn assert_text(node: &Node, expected: &'static str) {
        match node {
            Node::Text(_, s) => assert_eq!(s, expected),
            _ => assert_eq!(false, true),
        };
    }

    fn assert_text_pos(node: &Node, expected: &'static str, loc: usize) {
        match node {
            Node::Text(pos, s) => {
                assert_eq!(s, expected);
                assert_eq!(*pos, loc);
            }
            _ => assert_eq!(false, true),
        };
    }

    fn assert_code(node: &Node, expected_lang: Option<CodeblockLanguage>, expected: &'static str, loc: usize) {
        match node {
            Node::Codeblock(pos, lang, s) => {
                assert_eq!(lang, &expected_lang);
                assert_eq!(s, expected);
                assert_eq!(*pos, loc);
            }
            _ => assert_eq!(false, true),
        };
    }

    fn assert_image(src: &'static str, expected: &'static str) {
        let nodes = build(src);
        assert_eq!(1, nodes.len());

        match &nodes[0] {
            Node::Image(_, s) => assert_eq!(s, expected),
            _ => assert_eq!(false, true),
        };
    }

    // fn assert_url(node: &Node, expected_url: &'static str) {
    //     match node {
    //         Node::Url(url, _desc) => assert_eq!(url, expected_url),
    //         _ => assert_eq!(false, true),
    //     };
    // }

    fn assert_strong1_pos(node: &Node, expected: &'static str, loc: usize) {
        match node {
            Node::Strong(pos, ns) => {
                assert_eq!(ns.len(), 1);
                match &ns[0] {
                    Node::Paragraph(_, ns) => {
                        assert_text(&ns[0], expected);
                    }
                    _ => assert!(false),
                }
                assert_eq!(*pos, loc);
            }
            _ => assert_eq!(false, true),
        };
    }

    // fn assert_link(node: &Node, expected_url: &'static str, expected_text: &'static str) {
    //     match node {
    //         Node::Url(url, ns) => {
    //             assert_eq!(url, expected_url);
    //             assert_eq!(ns.len(), 1);
    //             assert_text(&ns[0], expected_text);
    //         }
    //         _ => assert_eq!(false, true),
    //     };
    // }

    fn assert_underline1_pos(node: &Node, expected: &'static str, loc: usize) {
        match node {
            Node::Underlined(pos, ns) => {
                assert_eq!(ns.len(), 1);

                match &ns[0] {
                    Node::Paragraph(_, ns) => {
                        assert_text(&ns[0], expected);
                    }
                    _ => assert!(false),
                }
                assert_eq!(*pos, loc);
            }
            _ => assert_eq!(false, true),
        };
    }

    fn assert_highlight1_pos(node: &Node, expected: &'static str, loc: usize) {
        match node {
            Node::Highlight(pos, ns) => {
                assert_eq!(ns.len(), 1);
                match &ns[0] {
                    Node::Paragraph(_, ns) => {
                        assert_text(&ns[0], expected);
                    }
                    _ => assert!(false),
                }
                assert_eq!(*pos, loc);
            }
            _ => assert_eq!(false, true),
        };
    }

    fn assert_quoted1(node: &Node, expected: &'static str, loc: usize) {
        match node {
            Node::Quotation(pos, ns) => {
                assert_eq!(ns.len(), 1);
                match &ns[0] {
                    Node::Paragraph(_, ns) => {
                        assert_text(&ns[0], expected);
                    }
                    _ => assert!(false),
                }
                assert_eq!(*pos, loc);
            }
            _ => assert_eq!(false, true),
        };
    }

    fn assert_horizontal_rule(node: &Node) {
        match node {
            Node::HorizontalRule(_) => assert!(true),
            _ => assert!(false),
        };
    }

    fn assert_header(node: &Node) {
        match node {
            Node::Header(_, _, _) => assert!(true),
            _ => assert!(false),
        };
    }

    fn assert_paragraph(node: &Node) {
        match node {
            Node::Paragraph(_, _) => assert!(true),
            _ => assert!(false),
        };
    }

    fn assert_single_paragraph_text(node: &Node, expected: &'static str) {
        assert_paragraph(node);
        match node {
            Node::Paragraph(_, children) => {
                assert_eq!(children.len(), 1);
                assert_text(&children[0], expected)
            }
            _ => assert!(false),
        };
    }

    fn assert_blockquote(node: &Node) {
        match node {
            Node::BlockQuote(_, _) => assert!(true),
            _ => assert!(false),
        };
    }

    #[test]
    fn test_only_text() {
        {
            let nodes = build("simple text only test");
            paragraph_with_single_text_pos(&nodes[0], "simple text only test", 0);
        }
        {
            let nodes = build("more token types 1234.9876 - treat as text");
            paragraph_with_single_text_pos(&nodes[0], "more token types 1234.9876 - treat as text", 0);
        }
    }

    #[test]
    fn test_strong() {
        {
            let nodes = build("words with *emphasis* test");
            dbg!(&nodes);
            assert_eq!(1, nodes.len());
            let children = paragraph_children(&nodes[0]).unwrap();
            assert_eq!(children.len(), 3);
            assert_text_pos(&children[0], "words with ", 0);
            assert_strong1_pos(&children[1], "emphasis", 11);
            assert_text_pos(&children[2], " test", 21);
        }
        {
            let nodes = build("words with *emphasis*");

            assert_eq!(1, nodes.len());
            let children = paragraph_children(&nodes[0]).unwrap();
            assert_eq!(children.len(), 2);
            assert_text(&children[0], "words with ");
            assert_strong1_pos(&children[1], "emphasis", 11);
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
            assert_underline1_pos(&children[1], "underlined", 11);
            assert_text(&children[2], " test");
        }
        {
            let nodes = build("words with _underlines_");

            assert_eq!(1, nodes.len());
            let children = paragraph_children(&nodes[0]).unwrap();
            assert_eq!(children.len(), 2);
            assert_text(&children[0], "words with ");
            assert_underline1_pos(&children[1], "underlines", 11);
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
            assert_highlight1_pos(&children[1], "highlighted", 11);
            assert_text(&children[2], " test");
        }
        {
            let nodes = build("words with ^highlight^");

            assert_eq!(1, nodes.len());
            let children = paragraph_children(&nodes[0]).unwrap();
            assert_eq!(children.len(), 2);
            assert_text(&children[0], "words with ");
            assert_highlight1_pos(&children[1], "highlight", 11);
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
            assert_quoted1(&children[1], "quoted", 11);
            assert_text(&children[2], " text");
        }
        {
            let nodes = build("sentence ending with \"quotation\"");

            assert_eq!(1, nodes.len());
            let children = paragraph_children(&nodes[0]).unwrap();
            assert_eq!(children.len(), 2);
            assert_text(&children[0], "sentence ending with ");
            assert_quoted1(&children[1], "quotation", 21);
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
        assert_eq!(children.len(), 2);

        match &children[0] {
            Node::Highlight(_, children) => match &children[0] {
                Node::Paragraph(_, children) => {
                    assert_eq!(children.len(), 3);
                    assert_strong1_pos(&children[0], "words", 1);
                    assert_text(&children[1], " with ");
                    assert_strong1_pos(&children[2], "strong", 14);
                }
                _ => assert_eq!(false, true),
            },
            _ => assert_eq!(false, true),
        }

        assert_text(&children[1], " test");
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

            let children = ordered_list_children(&nodes[0], "1").unwrap();
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

            let children = ordered_list_children(&nodes[0], "21").unwrap();
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

            let children = ordered_list_children(&nodes[0], "1").unwrap();
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

        paragraph_with_single_text_pos(&nodes[0], "this is the 1st paragraph", 0);

        let children = unordered_list_children(&nodes[1]).unwrap();
        assert_eq!(children.len(), 3);
        assert_list_item_text(&children[0], "item a");
        assert_list_item_text(&children[1], "item b");
        assert_list_item_text(&children[2], "item c");

        paragraph_with_single_text_pos(&nodes[2], "here is the closing paragraph", 53);
    }

    #[test]
    fn test_code() {
        {
            let nodes = build(
                "```
This is code
```",
            );

            assert_eq!(1, nodes.len());
            let children = paragraph_children(&nodes[0]).unwrap();
            dbg!(&children);
            assert_eq!(children.len(), 1);

            assert_code(&children[0], None, "\nThis is code\n", 0);
        }

        {
            let nodes = build(
                "```rust
This is code```",
            );

            assert_eq!(1, nodes.len());
            let children = paragraph_children(&nodes[0]).unwrap();
            dbg!(&children);
            assert_eq!(children.len(), 1);

            assert_code(&children[0], Some(CodeblockLanguage::Rust), "\nThis is code", 0);
        }
    }

    #[test]
    fn test_hyphen_around_quotation() {
        let nodes = build("Though Aristotle wrote many elegant treatises and dialogues - Cicero described his literary style as \"a river of gold\" - it is thought that only around a third of his original output has survived.");

        assert_eq!(1, nodes.len());
        let children = paragraph_children(&nodes[0]).unwrap();
        assert_eq!(children.len(), 3);

        assert_text_pos(
            &children[0],
            "Though Aristotle wrote many elegant treatises and dialogues - Cicero described his literary style as ",
            0,
        );
        assert_quoted1(&children[1], "a river of gold", 101);
        assert_text(
            &children[2],
            " - it is thought that only around a third of his original output has survived.",
        );
    }

    //     #[test]
    //     fn test_multi_paragraph_margin_text() {
    //         let nodes = build(
    //             "start of paragraph |foobar bar| more text in main paragraph afterwards
    // second main paragraph",
    //         );
    //         assert_eq!(3, nodes.len());
    //     }

    #[test]
    fn test_unordered_list_in_sidenote_bug() {
        let nodes = build(
            "para one|- hello
- foo| more text afterwards",
        );
        assert_eq!(1, nodes.len());

        let children = paragraph_children(&nodes[0]).unwrap();
        assert_eq!(children.len(), 3);
        assert_text(&children[0], "para one");

        match &children[1] {
            Node::MarginText(_, numbered, vs) => {
                assert_eq!(vs.len(), 1);
                assert_eq!(*numbered, true);
                match &vs[0] {
                    Node::UnorderedList(_, us) => {
                        assert_eq!(us.len(), 2);
                        assert_list_item_text(&us[0], "hello");
                        assert_list_item_text(&us[1], "foo");
                    }
                    _ => assert_eq!(false, true),
                }
            }
            _ => assert_eq!(false, true),
        };

        assert_text(&children[2], " more text afterwards");
    }

    #[test]
    fn test_margin_text() {
        {
            let nodes = build(
                "some words|right margin text
another paragraph
some other lines| more words afterwards",
            );

            assert_eq!(1, nodes.len());

            let children = paragraph_children(&nodes[0]).unwrap();
            assert_eq!(children.len(), 3);

            match &children[1] {
                Node::MarginText(_, numbered, nodes) => {
                    assert_eq!(*numbered, true);
                    assert_eq!(nodes.len(), 3);
                }
                _ => assert_eq!(false, true),
            };
        }
        {
            let nodes = build(
                "some words|~ unnumberedright margin text
another paragraph
some other lines| more words afterwards",
            );

            assert_eq!(1, nodes.len());

            let children = paragraph_children(&nodes[0]).unwrap();
            assert_eq!(children.len(), 3);

            match &children[1] {
                Node::MarginText(_, numbered, nodes) => {
                    assert_eq!(*numbered, false);
                    assert_eq!(nodes.len(), 3);
                }
                _ => assert_eq!(false, true),
            };
        }
    }

    #[test]
    fn test_margin_agree() {
        let nodes = build(
            "some logical opinion|# i agree with this point
another paragraph
some other lines| more words afterwards",
        );

        assert_eq!(1, nodes.len());

        let children = paragraph_children(&nodes[0]).unwrap();
        assert_eq!(children.len(), 3);

        match &children[1] {
            Node::MarginScribble(_, nodes) => {
                assert_eq!(nodes.len(), 3);
            }
            _ => assert_eq!(false, true),
        };
    }

    #[test]
    fn test_margin_disagree() {
        let nodes = build(
            "some contentious opinion|## i disagree with this point
another paragraph
some other lines| more words afterwards",
        );

        assert_eq!(1, nodes.len());

        let children = paragraph_children(&nodes[0]).unwrap();
        assert_eq!(children.len(), 3);

        match &children[1] {
            Node::MarginDisagree(_, nodes) => {
                assert_eq!(nodes.len(), 3);
            }
            _ => assert_eq!(false, true),
        };
    }

    #[test]
    fn test_ordered_list_in_sidenote_bug() {
        let nodes = build(
            "para two|1. item-a
2. item-b| more text afterwards",
        );
        assert_eq!(1, nodes.len());

        let children = paragraph_children(&nodes[0]).unwrap();
        assert_eq!(children.len(), 3);
        assert_text(&children[0], "para two");

        match &children[1] {
            Node::MarginText(_, numbered, vs) => {
                assert_eq!(vs.len(), 1);
                assert_eq!(*numbered, true);
                match &vs[0] {
                    Node::OrderedList(_, os, _) => {
                        assert_eq!(os.len(), 2);
                        assert_list_item_text(&os[0], "item-a");
                        assert_list_item_text(&os[1], "item-b");
                    }
                    _ => assert_eq!(false, true),
                }
            }
            _ => assert_eq!(false, true),
        };

        assert_text(&children[2], " more text afterwards");
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
    fn test_normal_text_with_tilde_bug() {
        // tilde used to mean scribbled-out but that was later removed
        //
        let nodes = build("abc ~AAAAAA~ def");

        assert_eq!(1, nodes.len());
        let children = paragraph_children(&nodes[0]).unwrap();
        assert_eq!(children.len(), 1);

        assert_text(&children[0], "abc ~AAAAAA~ def");
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
        let toks = vec![Token::Asterisk(0), Token::Asterisk(0)];
        assert_eq!(remaining_tokens_contain(&toks, TokenIdent::Asterisk), true);

        let toks2 = vec![Token::Asterisk(0), Token::Pipe(0)];
        assert_eq!(remaining_tokens_contain(&toks2, TokenIdent::Asterisk), false);

        let toks3 = vec![Token::Asterisk(0)];
        assert_eq!(remaining_tokens_contain(&toks3, TokenIdent::Asterisk), false);
    }

    #[test]
    fn test_skip_leading_whitespace_and_newlines() {
        let mut toks = tokenize("foo [bar]").unwrap();
        let mut res = skip_leading_whitespace_and_newlines(&toks).unwrap();
        assert_eq!(5, res.len());

        toks = tokenize("    foo [bar]").unwrap();
        res = skip_leading_whitespace_and_newlines(&toks).unwrap();
        assert_eq!(5, res.len());
    }

    #[test]
    fn test_at_image() {
        assert_image("@img(abc.jpg)", "abc.jpg");
        assert_image("@img(a00.jpg)", "a00.jpg");
        assert_image("@img(00a.jpg)", "00a.jpg");
        assert_image("@img(000.jpg)", "000.jpg");
    }

    #[test]
    fn test_at_url() {
        {
            let nodes = build("@url(https://google.com)");
            assert_eq!(1, nodes.len());

            let children = paragraph_children(&nodes[0]).unwrap();
            assert_eq!(children.len(), 1);

            let node = &children[0];
            match node {
                Node::Url(_, url, ns) => {
                    assert_eq!(url, "https://google.com");
                    assert_eq!(1, ns.len());
                    assert_single_paragraph_text(&ns[0], "https://google.com");
                }
                _ => assert_eq!(false, true),
            };
        }
        {
            let nodes = build("@url(https://google.com a few words)");
            assert_eq!(1, nodes.len());

            let children = paragraph_children(&nodes[0]).unwrap();
            assert_eq!(children.len(), 1);

            let node = &children[0];
            match node {
                Node::Url(_, url, ns) => {
                    assert_eq!(url, "https://google.com");
                    assert_eq!(1, ns.len());
                    assert_single_paragraph_text(&ns[0], "a few words");
                }
                _ => assert_eq!(false, true),
            };
        }
        {
            let nodes = build("@url(https://google.com a few (descriptive *bold*) words)");
            assert_eq!(1, nodes.len());

            let children = paragraph_children(&nodes[0]).unwrap();
            assert_eq!(children.len(), 1);

            let node = &children[0];
            match node {
                Node::Url(_, url, ns) => {
                    assert_eq!(url, "https://google.com");
                    assert_eq!(1, ns.len()); // paragraph

                    match &ns[0] {
                        Node::Paragraph(_, ns) => {
                            assert_eq!(3, ns.len()); // text, strong, text
                            assert_text(&ns[0], "a few (descriptive ");
                            assert_strong1_pos(&ns[1], "bold", 43);
                            assert_text(&ns[2], ") words");
                        }
                        _ => assert_eq!(false, true),
                    }
                }
                _ => assert_eq!(false, true),
            };
        }
    }

    #[test]
    fn test_split2() {
        {
            let text = Token::Text(0, &"hello world");
            let (t, remaining) = split_text_token_at_whitespace(text).unwrap();
            assert_eq!(t, Token::Text(0, &"hello"));
            assert_eq!(remaining, Some(Token::Text(5, &"world")));
        }
        {
            let text = Token::Text(0, &"once upon a time");
            let (t, remaining) = split_text_token_at_whitespace(text).unwrap();
            assert_eq!(t, Token::Text(0, &"once"));
            assert_eq!(remaining, Some(Token::Text(4, &"upon a time")));
        }
        {
            let text = Token::Text(0, &"one");
            let (t, remaining) = split_text_token_at_whitespace(text).unwrap();
            assert_eq!(t, Token::Text(0, &"one"));
            assert_eq!(remaining, None);
        }
    }

    #[test]
    fn test_hash() {
        {
            let nodes = build("#-");
            assert_eq!(1, nodes.len());

            assert_horizontal_rule(&nodes[0]);
        }
        {
            let nodes = build("#- Some words");
            assert_eq!(2, nodes.len());

            assert_horizontal_rule(&nodes[0]);

            let children = paragraph_children(&nodes[1]).unwrap();
            assert_text(&children[0], "Some words");
        }
    }

    #[test]
    fn test_url_bug() {
        {
            let nodes = build("@url(http://www.example.com/page.pdf#page=3 A document)");
            assert_eq!(1, nodes.len());

            let children = paragraph_children(&nodes[0]).unwrap();
            assert_eq!(children.len(), 1);

            let node = &children[0];
            match node {
                Node::Url(0, url, ns) => {
                    assert_eq!(url, "http://www.example.com/page.pdf#page=3");

                    assert_eq!(1, ns.len());
                    assert_single_paragraph_text(&ns[0], "A document");
                }
                _ => assert_eq!(false, true),
            };
        }
    }

    #[test]
    fn test_url_bug_2() {
        {
            let nodes = build("@url(https://en.wikipedia.org/wiki/Karl_Marx)");
            dbg!(&nodes);

            assert_eq!(1, nodes.len());

            let children = paragraph_children(&nodes[0]).unwrap();
            assert_eq!(children.len(), 1);

            let node = &children[0];
            match node {
                Node::Url(_, url, ns) => {
                    assert_eq!(url, "https://en.wikipedia.org/wiki/Karl_Marx");

                    assert_eq!(1, ns.len());
                    assert_paragraph(&ns[0]);
                    match &ns[0] {
                        Node::Paragraph(_, children) => {
                            assert_eq!(children.len(), 2);
                            assert_text(&children[0], "https://en.wikipedia.org/wiki/Karl");
                            assert_text(&children[1], "_Marx")
                        }
                        _ => assert!(false),
                    };
                }
                _ => assert_eq!(false, true),
            };
        }
    }

    // test that the given Node is a blockquote, with the expected number of children
    // return the children
    fn blockquote_with_children<'a>(blockquote: &'a Node, expected: usize) -> &'a Vec<Node> {
        assert_blockquote(blockquote);

        let children = blockquote_children(blockquote).unwrap();
        assert_eq!(children.len(), expected);

        children
    }

    fn header_with_single_text(node: &Node, expected_level: u32, expected: &'static str) {
        assert_header(node);
        match node {
            Node::Header(_, level, children) => {
                assert_eq!(*level, expected_level);
                assert_eq!(children.len(), 1);
                assert_text(&children[0], expected)
            }
            _ => assert!(false),
        };
    }

    fn header_with_multi_text(node: &Node, expected_level: u32, expected: &'static str) {
        assert_header(node);
        match node {
            Node::Header(_, level, children) => {
                assert_eq!(*level, expected_level);
                // children is a vec of nodes, assume that they're all text nodes for now
                let mut s = String::from("");
                for child in children {
                    match child {
                        Node::Text(_, cs) => {
                            s += cs;
                        }
                        _ => assert!(false),
                    }
                }
                assert_eq!(s, expected);
            }
            _ => assert!(false),
        };
    }

    // test that the Node is a paragraph with the expected text
    //
    fn paragraph_with_single_text(paragraph: &Node, expected: &'static str) {
        assert_paragraph(paragraph);

        let children = paragraph_children(paragraph).unwrap();
        assert_eq!(children.len(), 1);

        assert_text(&children[0], expected);
    }

    fn paragraph_with_single_text_pos(paragraph: &Node, expected: &'static str, loc: usize) {
        assert_paragraph(paragraph);

        let children = paragraph_children(paragraph).unwrap();
        assert_eq!(children.len(), 1);

        assert_text(&children[0], expected);
        assert_eq!(get_node_pos(&children[0]), loc);
    }

    #[test]
    fn test_parsing_blockquote() {
        {
            let nodes = build(">>> hello world <<<");
            assert_eq!(1, nodes.len());

            let children = blockquote_with_children(&nodes[0], 1);
            paragraph_with_single_text(&children[0], "hello world ");
        }

        {
            let nodes = build(
                ">>>
hello world

another paragraph

third paragraph
<<<",
            );
            assert_eq!(1, nodes.len());

            let children = blockquote_with_children(&nodes[0], 3);
            paragraph_with_single_text(&children[0], "hello world");
            paragraph_with_single_text(&children[1], "another paragraph");
            paragraph_with_single_text(&children[2], "third paragraph");
        }
        {
            let nodes = build(
                "opening paragraph
>>>
quoted paragraph 1
quoted paragraph 2
<<<
closing paragraph",
            );

            assert_eq!(3, nodes.len());

            paragraph_with_single_text(&nodes[0], "opening paragraph");
            let children = blockquote_with_children(&nodes[1], 2);
            paragraph_with_single_text(&children[0], "quoted paragraph 1");
            paragraph_with_single_text(&children[1], "quoted paragraph 2");
            paragraph_with_single_text(&nodes[2], "closing paragraph");
        }
    }

    #[test]
    fn test_parsing_paragraphs() {
        let nodes = build(
            "hello world

#-

another paragraph

third paragraph",
        );
        assert_eq!(4, nodes.len());

        paragraph_with_single_text(&nodes[0], "hello world");
        assert_horizontal_rule(&nodes[1]);
        paragraph_with_single_text(&nodes[2], "another paragraph");
        paragraph_with_single_text(&nodes[3], "third paragraph");
    }

    #[test]
    fn test_header_then_list_bug() {
        let nodes = build(
            "#h2 A header

- first unordered list item
- second unordered list item",
        );

        assert_eq!(2, nodes.len());
        header_with_single_text(&nodes[0], 2, "A header");
        let list_children = unordered_list_children(&nodes[1]).unwrap();
        assert_eq!(list_children.len(), 2);
        assert_list_item_text(&list_children[0], "first unordered list item");
        assert_list_item_text(&list_children[1], "second unordered list item");
    }

    #[test]
    fn test_header() {
        {
            let nodes = build("#h2 A header");
            assert_eq!(1, nodes.len());
            header_with_single_text(&nodes[0], 2, "A header");
        }
        {
            let nodes = build("#h3 A header (with parentheses)");
            assert_eq!(1, nodes.len());
            header_with_multi_text(&nodes[0], 3, "A header (with parentheses)");
        }
    }
}
