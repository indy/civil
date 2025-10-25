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
use crate::lexer::{get_token_pos, get_token_value, split_tokens_at, Token, TokenIdent};
use serde_derive::Serialize;
use strum_macros::EnumDiscriminants;

// a result type that returns a tuple of the remaining tokens as well as the given return value
pub type ParserResult<'a, T> = crate::Result<(&'a [Token<'a>], T)>;

#[derive(Debug, Serialize, PartialEq, Eq)]
pub enum MarginTextLabel {
    UnNumbered,
    Numbered,
}

#[derive(Debug, Serialize, PartialEq, Eq)]
pub enum ColourPalette {
    Red,
    Green,
    Blue,
    Yellow,
    Orange,
    Pink,
    Purple,
}


trait TokenSliceExt<'a> {
    fn is(&self, idx: usize, kind: TokenIdent) -> bool;
    fn is_next(&self, kind: TokenIdent) -> bool;
    fn is_next_2(&self, kind0: TokenIdent, kind1: TokenIdent) -> bool;
    fn is_next_3(&self, kind0: TokenIdent, kind1: TokenIdent, kind2: TokenIdent) -> bool;
    fn is_text(&self, idx: usize, text: &str) -> bool;
}

impl<'a> TokenSliceExt<'a> for [Token<'a>] {
    fn is(&self, idx: usize, kind: TokenIdent) -> bool {
        self.get(idx).map(|t| TokenIdent::from(t)) == Some(kind)
    }

    fn is_next(&self, kind: TokenIdent) -> bool {
        self.get(0).map(|t| TokenIdent::from(t)) == Some(kind)
    }

    fn is_next_2(&self, kind0: TokenIdent, kind1: TokenIdent) -> bool {
        self.get(0).map(|t| TokenIdent::from(t)) == Some(kind0)
            && self.get(1).map(|t| TokenIdent::from(t)) == Some(kind1)
    }

    fn is_next_3(&self, kind0: TokenIdent, kind1: TokenIdent, kind2: TokenIdent) -> bool {
        self.get(0).map(|t| TokenIdent::from(t)) == Some(kind0)
            && self.get(1).map(|t| TokenIdent::from(t)) == Some(kind1)
            && self.get(2).map(|t| TokenIdent::from(t)) == Some(kind2)
    }

    fn is_text(&self, idx: usize, text: &str) -> bool {
        matches!(self.get(idx), Some(&Token::Text(_, s)) if s == text)
    }
}


// NOTE: update the node check in www/js/index.js to reflect this enum
//
#[derive(Debug, Serialize, EnumDiscriminants)]
#[strum_discriminants(name(NodeIdent))]
pub enum Node {
    BlockQuote(usize, Vec<Node>),
    Codeblock(usize, String),
    ColouredText(usize, ColourPalette, Vec<Node>),
    Deleted(usize, Vec<Node>),
    Diagram(usize, String, Vec<Node>),
    DoubleQuoted(usize, Vec<Node>),
    Header(usize, u32, Vec<Node>),
    Highlight(usize, ColourPalette, Vec<Node>),
    HorizontalRule(usize),
    Image(usize, String, Vec<Node>),
    Italic(usize, Vec<Node>),
    ListItem(usize, Vec<Node>),
    MarginComment(usize, Vec<Node>),
    MarginDisagree(usize, Vec<Node>),
    MarginText(usize, MarginTextLabel, Vec<Node>),
    OrderedList(usize, Vec<Node>, String),
    Paragraph(usize, Vec<Node>),
    Searched(usize, Vec<Node>),
    Strong(usize, Vec<Node>),
    Subscript(usize, Vec<Node>),
    Superscript(usize, Vec<Node>),
    Text(usize, String),
    Underlined(usize, Vec<Node>),
    UnorderedList(usize, Vec<Node>),
    Url(usize, String, Vec<Node>),
    YouTube(usize, String, String),
}

fn get_node_pos(node: &Node) -> usize {
    match node {
        Node::BlockQuote(pos, _) => *pos,
        Node::Codeblock(pos, _) => *pos,
        Node::ColouredText(pos, _, _) => *pos,
        Node::Deleted(pos, _) => *pos,
        Node::Diagram(pos, _, _) => *pos,
        Node::DoubleQuoted(pos, _) => *pos,
        Node::Header(pos, _, _) => *pos,
        Node::Highlight(pos, _, _) => *pos,
        Node::HorizontalRule(pos) => *pos,
        Node::Image(pos, _, _) => *pos,
        Node::Italic(pos, _) => *pos,
        Node::ListItem(pos, _) => *pos,
        Node::MarginComment(pos, _) => *pos,
        Node::MarginDisagree(pos, _) => *pos,
        Node::MarginText(pos, _, _) => *pos,
        Node::OrderedList(pos, _, _) => *pos,
        Node::Paragraph(pos, _) => *pos,
        Node::Searched(pos, _) => *pos,
        Node::Strong(pos, _) => *pos,
        Node::Subscript(pos, _) => *pos,
        Node::Superscript(pos, _) => *pos,
        Node::Text(pos, _) => *pos,
        Node::Underlined(pos, _) => *pos,
        Node::UnorderedList(pos, _) => *pos,
        Node::Url(pos, _, _) => *pos,
        Node::YouTube(pos, _, _) => *pos,
    }
}

fn is_numbered_list_item(tokens: &'_ [Token]) -> bool {
    tokens.is_next_3(TokenIdent::Digits, TokenIdent::Period, TokenIdent::Whitespace)
}

fn is_unordered_list_item(tokens: &'_ [Token]) -> bool {
    tokens.is_next_2(TokenIdent::Hyphen, TokenIdent::Whitespace)
}

fn is_horizontal_rule(tokens: &'_ [Token]) -> bool {
    tokens.is_next_2(TokenIdent::Colon, TokenIdent::Hyphen)
        && (tokens.is(2, TokenIdent::Eos)
            || tokens.is(2, TokenIdent::Whitespace)
            || tokens.is(2, TokenIdent::Newline))
}

fn is_heading(tokens: &'_ [Token]) -> bool {
    let headings = ["h1", "h2", "h3", "h4", "h5", "h6", "h7", "h8", "h9"];

    if tokens.is_next_2(TokenIdent::Colon, TokenIdent::Text){
        match tokens[1] {
            Token::Text(_, s) => headings.contains(&s),
            _ => false,
        }
    } else {
        false
    }
}

fn is_img(tokens: &'_ [Token]) -> bool {
    is_colon_specifier(tokens) && tokens.is_text(1, "img")
}

fn is_diagram(tokens: &'_ [Token]) -> bool {
    is_colon_specifier(tokens) && tokens.is_text(1, "diagram")
}

// need: parse until a terminator token Eos is reached
//
pub fn parse<'a>(tokens: &'a [Token<'a>]) -> ParserResult<'a, Vec<Node>> {
    let mut tokens: &[Token] = tokens;
    let mut res = Vec::new();

    tokens = skip_leading_whitespace_and_newlines(tokens)?;
    while !tokens.is_empty() && !is_terminator(tokens) {
        let (rem, node) = if is_numbered_list_item(tokens) {
            eat_ordered_list(tokens, None)?
        } else if is_unordered_list_item(tokens) {
            eat_unordered_list(tokens, None)?
        } else if is_horizontal_rule(tokens) || is_heading(tokens) {
            eat_colon(tokens)?
        } else if is_img(tokens) {
            eat_img(tokens)?
        } else if is_diagram(tokens) {
            eat_diagram(tokens)?
        } else {
            // by default a lot of stuff will get wrapped in a paragraph
            eat_paragraph(tokens)?
        };

        res.push(node);
        tokens = skip_leading_whitespace_and_newlines(rem)?;
    }

    Ok((tokens, res))
}

// a version of parse that treats everything as textual paragraphs. Used
// when parsing headers as they shouldn't contain numbered lists
//
pub fn parse_as_paragraphs<'a>(tokens: &'a [Token<'a>]) -> ParserResult<'a, Vec<Node>> {
    let mut tokens: &[Token] = tokens;
    let mut res = Vec::new();

    tokens = skip_leading_whitespace_and_newlines(tokens)?;
    while !tokens.is_empty() && !is_terminator(tokens) {
        let (rem, node) = eat_paragraph(tokens)?;
        res.push(node);
        tokens = skip_leading_whitespace_and_newlines(rem)?;
    }

    Ok((tokens, res))
}

fn eat_ordered_list<'a>(mut tokens: &'a [Token<'a>], halt_at: Option<TokenIdent>) -> ParserResult<'a, Node> {
    let mut children: Vec<Node> = vec![];

    // tokens should be at a digit, this is the starting number for the ordered list
    let starts: String = match tokens[0] {
        Token::Digits(_, s) => s.to_string(),
        _ => return Err(Error::Parser),
    };

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

fn eat_unordered_list<'a>(mut tokens: &'a [Token<'a>], halt_at: Option<TokenIdent>) -> ParserResult<'a, Node> {
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

fn eat_to_newline<'a>(mut tokens: &'a [Token<'a>], halt_at: Option<TokenIdent>) -> ParserResult<'a, Vec<Node>> {
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
        Token::Colon(_) => eat_colon(tokens),
        Token::DoubleQuote(pos, _) => {
            if let Ok((toks, inside)) = inside_pair(tokens) {
                Ok((toks, Node::DoubleQuoted(pos, inside)))
            } else {
                eat_text_including(tokens)
            }
        }
        _ => eat_text(tokens),
    }
}

fn eat_img<'a>(tokens: &'a [Token<'a>]) -> ParserResult<'a, Node> {
    let pos = get_token_pos(&tokens[0]);
    let (tokens, (image_name, description)) = eat_as_image_description_pair(tokens)?;

    Ok((tokens, Node::Image(pos, image_name, description)))
}

fn eat_diagram<'a>(tokens: &'a [Token<'a>]) -> ParserResult<'a, Node> {
    let pos = get_token_pos(&tokens[0]);
    let (tokens, (image_name, code)) = eat_as_diagram_code_pair(tokens)?;

    Ok((tokens, Node::Diagram(pos, image_name, code)))
}

fn eat_youtube<'a>(tokens: &'a [Token<'a>]) -> ParserResult<'a, Node> {
    let pos = get_token_pos(&tokens[0]);
    let (tokens, (id, start)) = eat_as_youtube_id_start_pair(tokens)?;

    Ok((tokens, Node::YouTube(pos, id, start)))
}

fn eat_url<'a>(tokens: &'a [Token<'a>]) -> ParserResult<'a, Node> {
    let pos = get_token_pos(&tokens[0]);
    let (tokens, (url, description)) = eat_as_url_description_pair(tokens)?;

    Ok((tokens, Node::Url(pos, url, description)))
}

fn eat_bold<'a>(tokens: &'a [Token<'a>]) -> ParserResult<'a, Node> {
    let (tokens, (pos, parsed_content)) = eat_basic_colon_command(tokens)?;
    Ok((tokens, Node::Strong(pos, parsed_content)))
}

fn eat_searched<'a>(tokens: &'a [Token<'a>]) -> ParserResult<'a, Node> {
    let (tokens, (pos, parsed_content)) = eat_basic_colon_command(tokens)?;
    Ok((tokens, Node::Searched(pos, parsed_content)))
}

fn eat_highlighted<'a>(colour: ColourPalette, tokens: &'a [Token<'a>]) -> ParserResult<'a, Node> {
    let (tokens, (pos, parsed_content)) = eat_basic_colon_command(tokens)?;
    Ok((tokens, Node::Highlight(pos, colour, parsed_content)))
}

fn eat_coloured<'a>(colour: ColourPalette, tokens: &'a [Token<'a>]) -> ParserResult<'a, Node> {
    let (tokens, (pos, parsed_content)) = eat_basic_colon_command(tokens)?;
    Ok((tokens, Node::ColouredText(pos, colour, parsed_content)))
}

fn eat_underlined<'a>(tokens: &'a [Token<'a>]) -> ParserResult<'a, Node> {
    let (tokens, (pos, parsed_content)) = eat_basic_colon_command(tokens)?;
    Ok((tokens, Node::Underlined(pos, parsed_content)))
}

fn eat_italic<'a>(tokens: &'a [Token<'a>]) -> ParserResult<'a, Node> {
    let (tokens, (pos, parsed_content)) = eat_basic_colon_command(tokens)?;
    Ok((tokens, Node::Italic(pos, parsed_content)))
}

fn eat_subscript<'a>(tokens: &'a [Token<'a>]) -> ParserResult<'a, Node> {
    let (tokens, (pos, parsed_content)) = eat_basic_colon_command(tokens)?;
    Ok((tokens, Node::Subscript(pos, parsed_content)))
}

fn eat_superscript<'a>(tokens: &'a [Token<'a>]) -> ParserResult<'a, Node> {
    let (tokens, (pos, parsed_content)) = eat_basic_colon_command(tokens)?;
    Ok((tokens, Node::Superscript(pos, parsed_content)))
}

fn eat_deleted<'a>(tokens: &'a [Token<'a>]) -> ParserResult<'a, Node> {
    let (tokens, (pos, parsed_content)) = eat_basic_colon_command(tokens)?;
    Ok((tokens, Node::Deleted(pos, parsed_content)))
}

fn eat_header<'a>(level: u32, tokens: &'a [Token<'a>]) -> ParserResult<'a, Node> {
    let (tokens, (pos, parsed_content)) = eat_header_contents(tokens)?;
    Ok((tokens, Node::Header(pos, level, parsed_content)))
}

fn eat_side<'a>(tokens: &'a [Token<'a>]) -> ParserResult<'a, Node> {
    let (tokens, (pos, parsed_content)) = eat_basic_colon_command(tokens)?;
    Ok((
        tokens,
        Node::MarginText(pos, MarginTextLabel::UnNumbered, parsed_content),
    ))
}

fn eat_nside<'a>(tokens: &'a [Token<'a>]) -> ParserResult<'a, Node> {
    let (tokens, (pos, parsed_content)) = eat_basic_colon_command(tokens)?;
    Ok((tokens, Node::MarginText(pos, MarginTextLabel::Numbered, parsed_content)))
}

fn eat_comment<'a>(tokens: &'a [Token<'a>]) -> ParserResult<'a, Node> {
    let (tokens, (pos, parsed_content)) = eat_basic_colon_command(tokens)?;
    Ok((tokens, Node::MarginComment(pos, parsed_content)))
}

fn eat_disagree<'a>(tokens: &'a [Token<'a>]) -> ParserResult<'a, Node> {
    let (tokens, (pos, parsed_content)) = eat_basic_colon_command(tokens)?;
    Ok((tokens, Node::MarginDisagree(pos, parsed_content)))
}

fn eat_blockquote<'a>(tokens: &'a [Token<'a>]) -> ParserResult<'a, Node> {
    let (tokens, (pos, content)) = eat_basic_colon_command(tokens)?;
    Ok((tokens, Node::BlockQuote(pos, content)))
}

fn eat_code<'a>(tokens: &'a [Token<'a>]) -> ParserResult<'a, Node> {
    let (tokens, (pos, code)) = eat_basic_colon_command_as_string(tokens)?;
    Ok((tokens, Node::Codeblock(pos, code)))
}

fn eat_colon<'a>(mut tokens: &'a [Token<'a>]) -> ParserResult<'a, Node> {
    // either a horizontal line or more likely a colon command

    // Colon, Hyphen, Whitespace, (Text), Eos | EOL
    // ":- this text is following a horizontal line"

    let pos = get_token_pos(&tokens[0]);
    if tokens.is(1, TokenIdent::Hyphen) {
        if tokens.is(2, TokenIdent::Eos)
            || tokens.is(2, TokenIdent::Whitespace)
            || tokens.is(2, TokenIdent::Newline)
        {
            tokens = &tokens[3..];
        } else {
            tokens = &tokens[2..];
        }
        Ok((tokens, Node::HorizontalRule(pos)))
    } else if tokens.is(1, TokenIdent::Text) {
        match tokens[1] {
            Token::Text(_, "img") => eat_img(tokens),
            Token::Text(_, "url") => eat_url(tokens),
            Token::Text(_, "b") => eat_bold(tokens),
            Token::Text(_, "hi") => eat_highlighted(ColourPalette::Yellow, tokens),
            Token::Text(_, "hi-red") => eat_highlighted(ColourPalette::Red, tokens),
            Token::Text(_, "hi-green") => eat_highlighted(ColourPalette::Green, tokens),
            Token::Text(_, "hi-blue") => eat_highlighted(ColourPalette::Blue, tokens),
            Token::Text(_, "hi-yellow") => eat_highlighted(ColourPalette::Yellow, tokens),
            Token::Text(_, "hi-orange") => eat_highlighted(ColourPalette::Orange, tokens),
            Token::Text(_, "hi-pink") => eat_highlighted(ColourPalette::Pink, tokens),
            Token::Text(_, "hi-purple") => eat_highlighted(ColourPalette::Purple, tokens),

            Token::Text(_, "red") => eat_coloured(ColourPalette::Red, tokens),
            Token::Text(_, "green") => eat_coloured(ColourPalette::Green, tokens),
            Token::Text(_, "blue") => eat_coloured(ColourPalette::Blue, tokens),
            Token::Text(_, "yellow") => eat_coloured(ColourPalette::Yellow, tokens),
            Token::Text(_, "orange") => eat_coloured(ColourPalette::Orange, tokens),
            Token::Text(_, "pink") => eat_coloured(ColourPalette::Pink, tokens),
            Token::Text(_, "purple") => eat_coloured(ColourPalette::Purple, tokens),

            Token::Text(_, "u") => eat_underlined(tokens),
            Token::Text(_, "i") => eat_italic(tokens),
            Token::Text(_, "h1") => eat_header(1, tokens),
            Token::Text(_, "h2") => eat_header(2, tokens),
            Token::Text(_, "h3") => eat_header(3, tokens),
            Token::Text(_, "h4") => eat_header(4, tokens),
            Token::Text(_, "h5") => eat_header(5, tokens),
            Token::Text(_, "h6") => eat_header(6, tokens),
            Token::Text(_, "h7") => eat_header(7, tokens),
            Token::Text(_, "h8") => eat_header(8, tokens),
            Token::Text(_, "h9") => eat_header(9, tokens),
            Token::Text(_, "blockquote") => eat_blockquote(tokens),
            Token::Text(_, "code") => eat_code(tokens),
            Token::Text(_, "verbatim") => eat_code(tokens),
            Token::Text(_, "comment") => eat_comment(tokens),
            Token::Text(_, "deleted") => eat_deleted(tokens),
            Token::Text(_, "disagree") => eat_disagree(tokens),
            Token::Text(_, "nside") => eat_nside(tokens),
            Token::Text(_, "searched") => eat_searched(tokens),
            Token::Text(_, "side") => eat_side(tokens),
            Token::Text(_, "subscript") => eat_subscript(tokens),
            Token::Text(_, "superscript") => eat_superscript(tokens),
            Token::Text(_, "youtube") => eat_youtube(tokens),
            _ => eat_text_including(tokens),
        }
    } else {
        eat_text_including(tokens)
    }
}

fn is_colon_specifier<'a>(tokens: &'a [Token<'a>]) -> bool {
    tokens.is_next_3(TokenIdent::Colon, TokenIdent::Text, TokenIdent::ParenBegin)
}

fn split_text_token_at_whitespace<'a>(text_token: Token<'a>) -> crate::Result<(Token<'a>, Option<Token<'a>>)> {
    match text_token {
        Token::Text(p, s) => {
            let tokens: Vec<Token<'a>> = s.split_whitespace().map(|chars| Token::Text(p, chars)).collect();
            let t = &tokens[0];
            match t {
                Token::Text(p, u) => {
                    if let Some(remaining_text) = s.strip_prefix(u) {
                        if remaining_text.chars().count() > 0 {
                            let rhs = Token::Text(p + u.chars().count(), remaining_text.trim_start());
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

fn eat_content<'a>(mut tokens: &'a [Token<'a>]) -> ParserResult<'a, Vec<Token<'a>>> {
    let mut content: Vec<Token> = vec![];
    let mut paren_balancer = 1;

    while !tokens.is_empty() {
        if is_head(tokens, TokenIdent::ParenBegin) {
            let pos = get_token_pos(&tokens[0]);
            paren_balancer += 1;
            tokens = &tokens[1..];
            content.push(Token::ParenBegin(pos));
        } else if is_head(tokens, TokenIdent::ParenEnd) {
            paren_balancer -= 1;
            let pos = get_token_pos(&tokens[0]);
            tokens = &tokens[1..];

            if paren_balancer == 0 {
                // reached the closing paren
                break;
            }
            content.push(Token::ParenEnd(pos));
        } else {
            content.push(tokens[0]);
            tokens = &tokens[1..];
        }
    }

    Ok((tokens, content))
}


fn join_token_values<'a>(tokens: &[Token<'a>]) -> String {
    tokens.iter().map(get_token_value).collect()
}

fn eat_as_string<'a>(tokens: &'a [Token<'a>]) -> ParserResult<'a, (usize, String)> {
    let pos = get_token_pos(&tokens[0]);
    let (tokens, content) = eat_content(tokens)?;

    let text = join_token_values(&content);

    Ok((tokens, (pos, text)))
}

// returns tokens within the colon command
//
fn eat_colon_command_content<'a>(mut tokens: &'a [Token<'a>]) -> ParserResult<'a, Vec<Token<'a>>> {
    tokens = &tokens[3..]; // eat the colon, text, opening parentheses
    eat_content(tokens)
}

fn eat_basic_colon_command_as_string<'a>(tokens: &'a [Token<'a>]) -> ParserResult<'a, (usize, String)> {
    let pos = get_token_pos(&tokens[0]);
    let (tokens, content) = eat_colon_command_content(tokens)?;
    let text = join_token_values(&content);

    Ok((tokens, (pos, text)))
}

fn eat_basic_colon_command<'a>(tokens: &'a [Token<'a>]) -> ParserResult<'a, (usize, Vec<Node>)> {
    let pos = get_token_pos(&tokens[0]);
    let (tokens, content) = eat_colon_command_content(tokens)?;

    let (rem, parsed_content) = parse(&content)?;
    if !rem.is_empty() {
        return Err(Error::ParserExpectedToEatAll);
    }

    Ok((tokens, (pos, parsed_content)))
}

fn eat_header_contents<'a>(tokens: &'a [Token<'a>]) -> ParserResult<'a, (usize, Vec<Node>)> {
    let pos = get_token_pos(&tokens[0]);
    let (tokens, content) = eat_colon_command_content(tokens)?;

    let (rem, parsed_content) = parse_as_paragraphs(&content)?;
    if !rem.is_empty() {
        return Err(Error::ParserExpectedToEatAll);
    }

    Ok((tokens, (pos, parsed_content)))
}

// returns found_divide, left tokens, right tokens
//
fn eat_colon_command_pairing<'a>(
    mut tokens: &'a [Token<'a>],
) -> ParserResult<'a, (bool, Vec<Token<'a>>, Vec<Token<'a>>)> {
    let mut found_desc_divide = false;
    let mut core_tokens: Vec<Token> = vec![];
    let mut desc_tokens: Vec<Token> = vec![];

    let mut paren_balancer = 1;

    tokens = &tokens[3..]; // eat the colon, text, opening parentheses

    while !tokens.is_empty() {
        if is_head(tokens, TokenIdent::ParenBegin) {
            let pos = get_token_pos(&tokens[0]);
            paren_balancer += 1;
            tokens = &tokens[1..];
            if found_desc_divide {
                desc_tokens.push(Token::ParenBegin(pos));
            } else {
                core_tokens.push(Token::ParenBegin(pos));
            }
        } else if is_head(tokens, TokenIdent::ParenEnd) {
            paren_balancer -= 1;
            let pos = get_token_pos(&tokens[0]);
            tokens = &tokens[1..];

            if paren_balancer == 0 {
                // reached the closing paren
                break;
            }
            if found_desc_divide {
                desc_tokens.push(Token::ParenEnd(pos));
            } else {
                core_tokens.push(Token::ParenEnd(pos));
            }
        } else if is_head(tokens, TokenIdent::Text) && !found_desc_divide {
            let (first_text_token, maybe_other_text_token) = split_text_token_at_whitespace(tokens[0])?;

            core_tokens.push(first_text_token);
            if let Some(maybe) = maybe_other_text_token {
                found_desc_divide = true;
                desc_tokens.push(maybe);
            }
            tokens = &tokens[1..];
        } else if is_head(tokens, TokenIdent::Whitespace) && !found_desc_divide {
            found_desc_divide = true;
        } else {
            if found_desc_divide {
                desc_tokens.push(tokens[0]);
            } else {
                core_tokens.push(tokens[0]);
            }
            tokens = &tokens[1..];
        }
    }

    Ok((tokens, (found_desc_divide, core_tokens, desc_tokens)))
}

fn eat_as_youtube_id_start_pair<'a>(tokens: &'a [Token<'a>]) -> ParserResult<'a, (String, String)> {
    let (tokens, (found_divide, left, right)) = eat_colon_command_pairing(tokens)?;

    let id = join_token_values(&left);

    let start: String;
    if found_divide {
        start = join_token_values(&right);
    } else {
        start = String::from("0");
    }

    Ok((tokens, (id, start)))
}

// treat every token as Text until we get to a token of the given type
fn eat_as_url_description_pair<'a>(tokens: &'a [Token<'a>]) -> ParserResult<'a, (String, Vec<Node>)> {
    let (tokens, (found_divide, left, right)) = eat_colon_command_pairing(tokens)?;
    let res = join_token_values(&left);

    // if there is no text after the first space then use the url as the displayed text
    //
    let (_, description_nodes) = if found_divide { parse(&right)? } else { parse(&left)? };

    Ok((tokens, (res, description_nodes)))
}

fn eat_as_image_description_pair<'a>(tokens: &'a [Token<'a>]) -> ParserResult<'a, (String, Vec<Node>)> {
    let (tokens, (found_divide, left, right)) = eat_colon_command_pairing(tokens)?;
    let res = join_token_values(&left);

    // only have descriptive text if it's in the markup after the image filename
    //
    if found_divide {
        let (_, description_nodes) = parse(&right)?;
        Ok((tokens, (res, description_nodes)))
    } else {
        Ok((tokens, (res, vec![])))
    }
}

fn eat_code_block<'a>(tokens: &'a [Token<'a>]) -> ParserResult<'a, Node> {
    let (tokens, (pos, code)) = eat_as_string(tokens)?;

    Ok((tokens, Node::Codeblock(pos, code)))
}

fn eat_as_diagram_code_pair<'a>(tokens: &'a [Token<'a>]) -> ParserResult<'a, (String, Vec<Node>)> {
    let (tokens, (found_divide, left, right)) = eat_colon_command_pairing(tokens)?;
    let res = join_token_values(&left);

    // only have code if it's in the markup after the diagram's filename
    //
    if found_divide {
        let (_, code) = eat_code_block(&right)?;
        Ok((tokens, (res, vec![code])))
    } else {
        Ok((tokens, (res, vec![])))
    }
}

// treat the first token as Text and then append any further Text tokens
fn eat_text_including<'a>(tokens: &'a [Token<'a>]) -> ParserResult<'a, Node> {
    let pos = get_token_pos(&tokens[0]);
    let (tokens, s) = eat_token_as_str(tokens)?;
    let (tokens, st) = eat_text_as_string(tokens)?;

    Ok((tokens, Node::Text(pos, s.to_string() + &st)))
}

fn eat_text<'a>(tokens: &'a [Token<'a>]) -> ParserResult<'a, Node> {
    let pos = get_token_pos(&tokens[0]);
    let (tokens, value) = eat_text_as_string(tokens)?;

    Ok((tokens, Node::Text(pos, value)))
}

fn skip_leading_whitespace_and_newlines<'a>(tokens: &'a [Token]) -> crate::Result<&'a [Token<'a>]> {
    for (i, tok) in tokens.iter().enumerate() {
        match tok {
            Token::Whitespace(_, _) | Token::Newline(_) => (),
            _ => return Ok(&tokens[i..]),
        }
    }

    Ok(&[])
}

fn skip_leading_newlines<'a>(tokens: &'a [Token]) -> crate::Result<&'a [Token<'a>]> {
    skip_leading(tokens, TokenIdent::Newline)
}

fn eat_token_as_str<'a>(tokens: &'a [Token<'a>]) -> crate::Result<(&'a [Token<'a>], &'a str)> {
    Ok((&tokens[1..], get_token_value(&tokens[0])))
}

fn eat_text_as_string<'a>(mut tokens: &'a [Token<'a>]) -> ParserResult<'a, String> {
    let mut value: String = "".to_string();

    while !tokens.is_empty() {
        match tokens[0] {
            Token::Text(_, s) => value += s,
            Token::Digits(_, s) => value += s,
            Token::Whitespace(_, s) => value += s,
            Token::Period(_) => value += ".",
            Token::Hyphen(_) => value += "-",
            Token::ParenBegin(_) => value += "(",
            Token::ParenEnd(_) => value += ")",
            _ => return Ok((tokens, value)),
        }
        tokens = &tokens[1..];
    }

    Ok((tokens, value))
}

fn skip_leading<'a>(tokens: &'a [Token], token_ident: TokenIdent) -> crate::Result<&'a [Token<'a>]> {
    for (i, tok) in tokens.iter().enumerate() {
        if Into::<TokenIdent>::into(tok) != token_ident {
            return Ok(&tokens[i..]);
        }
    }

    Ok(&[])
}

fn is_terminator<'a>(tokens: &'a [Token<'a>]) -> bool {
    tokens.is_next(TokenIdent::Eos)
}

fn is_head<'a>(tokens: &'a [Token<'a>], token_ident: TokenIdent) -> bool {
    tokens.is_next(token_ident)
}

fn is_head_option<'a>(tokens: &'a [Token<'a>], token_ident: Option<TokenIdent>) -> bool {
    if let Some(ident) = token_ident {
        tokens.is_next(ident)
    } else {
        false
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::error::Error;
    use crate::lexer::tokenize;
    use crate::lexer::Token;

    fn build(s: &'static str) -> Vec<Node> {
        let toks = tokenize(s).unwrap();
        let (_, res) = parse(&toks).unwrap();
        res
    }

    #[test]
    fn test_is_horizontal_rule() {
        {
            let toks = tokenize(":- ").unwrap();
            assert_eq!(is_horizontal_rule(&toks), true);
        }
        {
            let toks = tokenize(":-").unwrap();
            assert_eq!(is_horizontal_rule(&toks), true);
        }
    }

    #[test]
    fn test_is_img() {
        {
            let toks = tokenize(":img(foo.jpeg)").unwrap();
            dbg!(&toks);
            assert_eq!(is_img(&toks), true);
        }
        {
            let toks = tokenize(":img").unwrap();
            dbg!(&toks);
            assert_eq!(is_img(&toks), false);
        }
    }

    fn ordered_list_children<'a>(node: &'a Node, expected_starts: &str) -> crate::Result<&'a Vec<Node>> {
        match node {
            Node::OrderedList(_, children, starts) => {
                assert_eq!(starts, &expected_starts);

                return Ok(children);
            }
            _ => assert_eq!(false, true),
        };
        Err(Error::Parser)
    }

    fn unordered_list_children<'a>(node: &'a Node) -> crate::Result<&'a Vec<Node>> {
        match node {
            Node::UnorderedList(_, children) => {
                return Ok(children);
            }
            _ => assert_eq!(false, true),
        };
        Err(Error::Parser)
    }

    fn paragraph_children<'a>(node: &'a Node) -> crate::Result<&'a Vec<Node>> {
        match node {
            Node::Paragraph(_, children) => {
                return Ok(children);
            }
            _ => assert_eq!(false, true),
        };
        Err(Error::Parser)
    }

    fn blockquote_children<'a>(node: &'a Node) -> crate::Result<&'a Vec<Node>> {
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

    fn assert_code(node: &Node, expected: &'static str, loc: usize) {
        match node {
            Node::Codeblock(pos, s) => {
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
            Node::Image(_, s, ns) => {
                assert_eq!(s, expected);
                assert_eq!(ns.len(), 0);
            }
            _ => assert_eq!(false, true),
        };
    }

    fn assert_image_with_description(src: &'static str, expected: &'static str, expected_desc: &'static str) {
        let nodes = build(src);
        assert_eq!(1, nodes.len());

        match &nodes[0] {
            Node::Image(_, s, ns) => {
                dbg!(&nodes);

                assert_eq!(s, expected);
                assert_eq!(ns.len(), 1);

                assert_single_paragraph_text(&ns[0], expected_desc);
            }
            _ => assert_eq!(false, true),
        };
    }

    fn assert_url(node: &Node, expected_url: &'static str) {
        match node {
            Node::Url(_sz, url, _desc) => {
                assert_eq!(url, expected_url);
            }
            _ => assert_eq!(false, true),
        };
    }

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

    fn assert_highlight1_pos(node: &Node, expected: &'static str, colour: ColourPalette, loc: usize) {
        match node {
            Node::Highlight(pos, col, ns) => {
                assert_eq!(ns.len(), 1);
                assert_eq!(*col, colour);
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

    fn assert_double_quoted_1(node: &Node, expected: &'static str, loc: usize) {
        match node {
            Node::DoubleQuoted(pos, ns) => {
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

    fn assert_horizontal_ruleloc(node: &Node, loc: usize) {
        match node {
            Node::HorizontalRule(pos) => {
                assert_eq!(*pos, loc);
                assert!(true);
            }
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
            let nodes = build("words with :b(emphasis) test");
            assert_eq!(1, nodes.len());
            let children = paragraph_children(&nodes[0]).unwrap();
            assert_eq!(children.len(), 3);
            assert_text_pos(&children[0], "words with ", 0);
            assert_strong1_pos(&children[1], "emphasis", 11);
            assert_text_pos(&children[2], " test", 23);
        }
        {
            let nodes = build("words with :b(emphasis) test");
            assert_eq!(1, nodes.len());
            let children = paragraph_children(&nodes[0]).unwrap();
            assert_eq!(children.len(), 3);
            assert_text_pos(&children[0], "words with ", 0);
            assert_strong1_pos(&children[1], "emphasis", 11);
            assert_text_pos(&children[2], " test", 23);
        }
        {
            let nodes = build("words with :b(emphasis)");

            assert_eq!(1, nodes.len());
            let children = paragraph_children(&nodes[0]).unwrap();
            assert_eq!(children.len(), 2);
            assert_text(&children[0], "words with ");
            assert_strong1_pos(&children[1], "emphasis", 11);
        }
    }

    #[test]
    fn test_underline() {
        {
            let nodes = build("words with :u(underlined) test");

            assert_eq!(1, nodes.len());
            let children = paragraph_children(&nodes[0]).unwrap();
            assert_eq!(children.len(), 3);
            assert_text(&children[0], "words with ");
            assert_underline1_pos(&children[1], "underlined", 11);
            assert_text(&children[2], " test");
        }
        {
            let nodes = build("words with :u(underlines)");

            assert_eq!(1, nodes.len());
            let children = paragraph_children(&nodes[0]).unwrap();
            assert_eq!(children.len(), 2);
            assert_text(&children[0], "words with ");
            assert_underline1_pos(&children[1], "underlines", 11);
        }
    }

    #[test]
    fn test_highlight() {
        {
            let nodes = build("words with :hi(highlighted) test");

            assert_eq!(1, nodes.len());
            let children = paragraph_children(&nodes[0]).unwrap();
            assert_eq!(children.len(), 3);
            assert_text(&children[0], "words with ");
            assert_highlight1_pos(&children[1], "highlighted", ColourPalette::Yellow, 11);
            assert_text(&children[2], " test");
        }
        {
            let nodes = build("words with :hi(highlight)");

            assert_eq!(1, nodes.len());
            let children = paragraph_children(&nodes[0]).unwrap();
            assert_eq!(children.len(), 2);
            assert_text(&children[0], "words with ");
            assert_highlight1_pos(&children[1], "highlight", ColourPalette::Yellow, 11);
        }
        {
            let nodes = build("words with :hi-purple(highlighted) test");

            assert_eq!(1, nodes.len());
            let children = paragraph_children(&nodes[0]).unwrap();
            assert_eq!(children.len(), 3);
            assert_text(&children[0], "words with ");
            assert_highlight1_pos(&children[1], "highlighted", ColourPalette::Purple, 11);
            assert_text(&children[2], " test");
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
            assert_double_quoted_1(&children[1], "quoted", 11);
            assert_text(&children[2], " text");
        }
        {
            let nodes = build("sentence ending with \"quotation\"");

            assert_eq!(1, nodes.len());
            let children = paragraph_children(&nodes[0]).unwrap();
            assert_eq!(children.len(), 2);
            assert_text(&children[0], "sentence ending with ");
            assert_double_quoted_1(&children[1], "quotation", 21);
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
        let nodes = build(":hi(:b(words) with :b(strong)) test");
        assert_eq!(1, nodes.len());
        let children = paragraph_children(&nodes[0]).unwrap();
        assert_eq!(children.len(), 2);

        match &children[0] {
            Node::Highlight(_, _, children) => match &children[0] {
                Node::Paragraph(_, children) => {
                    assert_eq!(children.len(), 3);
                    assert_strong1_pos(&children[0], "words", 4);
                    assert_text(&children[1], " with ");
                    assert_strong1_pos(&children[2], "strong", 19);
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
            let nodes = build(":code(This is code)");

            assert_eq!(1, nodes.len());
            let children = paragraph_children(&nodes[0]).unwrap();
            dbg!(&children);
            assert_eq!(children.len(), 1);

            assert_code(&children[0], "This is code", 0);
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
        assert_double_quoted_1(&children[1], "a river of gold", 101);
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
            "para one:side(- hello
- foo) more text afterwards",
        );
        assert_eq!(1, nodes.len());

        let children = paragraph_children(&nodes[0]).unwrap();
        assert_eq!(children.len(), 3);
        assert_text(&children[0], "para one");

        match &children[1] {
            Node::MarginText(_, numbered, vs) => {
                assert_eq!(vs.len(), 1);
                assert_eq!(*numbered, MarginTextLabel::UnNumbered);
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
                "some words:side(right margin text
another paragraph
some other lines) more words afterwards",
            );

            assert_eq!(1, nodes.len());

            let children = paragraph_children(&nodes[0]).unwrap();
            assert_eq!(children.len(), 3);

            match &children[1] {
                Node::MarginText(_, numbered, nodes) => {
                    assert_eq!(*numbered, MarginTextLabel::UnNumbered);
                    assert_eq!(nodes.len(), 3);
                }
                _ => assert_eq!(false, true),
            };
        }
        {
            let nodes = build(
                "some words:nside(numberedright margin text
another paragraph
some other lines) more words afterwards",
            );

            assert_eq!(1, nodes.len());

            let children = paragraph_children(&nodes[0]).unwrap();
            assert_eq!(children.len(), 3);

            match &children[1] {
                Node::MarginText(_, numbered, nodes) => {
                    assert_eq!(*numbered, MarginTextLabel::Numbered);
                    assert_eq!(nodes.len(), 3);
                }
                _ => assert_eq!(false, true),
            };
        }
    }

    #[test]
    fn test_margin_agree() {
        let nodes = build(
            "some logical opinion:comment(i agree with this point
another paragraph
some other lines) more words afterwards",
        );

        assert_eq!(1, nodes.len());

        let children = paragraph_children(&nodes[0]).unwrap();
        assert_eq!(children.len(), 3);

        match &children[1] {
            Node::MarginComment(_, nodes) => {
                assert_eq!(nodes.len(), 3);
            }
            _ => assert_eq!(false, true),
        };
    }

    #[test]
    fn test_margin_disagree() {
        let nodes = build(
            "some contentious opinion:disagree(i disagree with this point
another paragraph
some other lines) more words afterwards",
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
            "para two:side(1. item-a
2. item-b) more text afterwards",
        );
        assert_eq!(1, nodes.len());

        let children = paragraph_children(&nodes[0]).unwrap();
        assert_eq!(children.len(), 3);
        assert_text(&children[0], "para two");

        match &children[1] {
            Node::MarginText(_, numbered, vs) => {
                assert_eq!(vs.len(), 1);
                assert_eq!(*numbered, MarginTextLabel::UnNumbered);
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
    fn test_skip_leading_whitespace_and_newlines() {
        let mut toks = tokenize("foo bar").unwrap();
        let mut res = skip_leading_whitespace_and_newlines(&toks).unwrap();
        dbg!(&res);
        assert_eq!(2, res.len()); // text + Eos

        toks = tokenize("    foo bar").unwrap();
        res = skip_leading_whitespace_and_newlines(&toks).unwrap();
        dbg!(&res);
        assert_eq!(2, res.len());
    }

    #[test]
    fn test_at_image() {
        assert_image(":img(abc.jpg)", "abc.jpg");
        assert_image(":img(a00.jpg)", "a00.jpg");
        assert_image(":img(00a.jpg)", "00a.jpg");
        assert_image(":img(000.jpg)", "000.jpg");

        assert_image_with_description(":img(000.jpg hello)", "000.jpg", "hello");
        assert_image_with_description(
            ":img(123.jpg hello this is a description)",
            "123.jpg",
            "hello this is a description",
        );
    }

    #[test]
    fn test_at_url() {
        {
            let nodes = build(":url(https://google.com)");
            assert_eq!(1, nodes.len());

            let children = paragraph_children(&nodes[0]).unwrap();
            assert_eq!(children.len(), 1);

            let node = &children[0];
            match node {
                Node::Url(_, url, ns) => {
                    assert_eq!(url, "https://google.com");
                    assert_eq!(1, ns.len());

                    let children = paragraph_children(&ns[0]).unwrap();
                    assert_eq!(children.len(), 2);
                    assert_text(&children[0], "https");
                    assert_text(&children[1], "://google.com");
                }
                _ => assert_eq!(false, true),
            };
        }
        {
            let nodes = build(":url(https://google.com a few words)");
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
            let nodes = build(":url(https://google.com a few (descriptive :b(bold)) words)");
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
        {
            let nodes = build("this is :url(https://google.com) a link within some words");
            assert_eq!(1, nodes.len());

            let children = paragraph_children(&nodes[0]).unwrap();
            assert_eq!(children.len(), 3);

            assert_text(&children[0], "this is ");
            assert_url(&children[1], "https://google.com");
            assert_text(&children[2], " a link within some words");
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
    fn test_colon() {
        {
            let nodes = build(":-");
            assert_eq!(1, nodes.len());

            assert_horizontal_rule(&nodes[0]);
        }
        {
            let nodes = build(":- Some words");
            assert_eq!(2, nodes.len());

            assert_horizontal_rule(&nodes[0]);

            let children = paragraph_children(&nodes[1]).unwrap();
            assert_text(&children[0], "Some words");
        }
    }

    #[test]
    fn test_url_bug() {
        {
            let nodes = build(":url(http://www.example.com/page.pdf#page=3 A document)");
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
    fn test_url_bug_3() {
        {
            let nodes = build(":url(https://en.wikipedia.org/wiki/May_68 May 68)");
            dbg!(&nodes);

            assert_eq!(1, nodes.len());

            let children = paragraph_children(&nodes[0]).unwrap();
            assert_eq!(children.len(), 1);

            let node = &children[0];
            match node {
                Node::Url(_, url, ns) => {
                    assert_eq!(url, "https://en.wikipedia.org/wiki/May_68");

                    assert_eq!(1, ns.len());
                    assert_paragraph(&ns[0]);
                    match &ns[0] {
                        Node::Paragraph(_, children) => {
                            assert_eq!(children.len(), 1);
                            assert_text(&children[0], "May 68");
                        }
                        _ => assert!(false),
                    };
                }
                _ => assert_eq!(false, true),
            };
        }
    }

    // test that the given Node is a paragraph with a blockquote with the expected number of children
    // return the children
    fn paragraph_with_blockquote_with_children<'a>(node: &'a Node, expected: usize) -> &'a Vec<Node> {
        let kids = paragraph_children(&node).unwrap();
        assert_blockquote(&kids[0]);

        let children = blockquote_children(&kids[0]).unwrap();
        assert_eq!(children.len(), expected);

        children
    }

    fn header_with_single_text(node: &Node, expected_level: u32, expected: &'static str) {
        assert_header(node);
        match node {
            Node::Header(_, level, children) => {
                assert_eq!(*level, expected_level);
                assert_eq!(children.len(), 1);
                assert_single_paragraph_text(&children[0], expected)
                // assert_text(&children[0], expected)
            }
            _ => assert!(false),
        };
    }

    fn header_with_multi_text(node: &Node, expected_level: u32, expected: &'static str) {
        assert_header(node);
        match node {
            Node::Header(_, level, children) => {
                assert_eq!(*level, expected_level);
                match &children[0] {
                    Node::Paragraph(_, children) => {
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
                }
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
    fn test_parsing_paragraph_and_blockquote_on_same_line() {
        let nodes = build("hi :blockquote(hello world)");
        // dbg!(&nodes);
        assert_eq!(1, nodes.len());

        let children = paragraph_children(&nodes[0]).unwrap();
        assert_eq!(2, children.len());

        assert_text(&children[0], "hi ");

        let bq_children = blockquote_children(&children[1]).unwrap();
        assert_single_paragraph_text(&bq_children[0], "hello world");
    }

    #[test]
    fn test_parsing_blockquote() {
        {
            let nodes = build(":blockquote(hello world)");
            assert_eq!(1, nodes.len());

            let children = paragraph_with_blockquote_with_children(&nodes[0], 1);
            paragraph_with_single_text(&children[0], "hello world");
        }

        {
            let nodes = build(
                ":blockquote(
        hello world

        another paragraph

        third paragraph
        )",
            );
            assert_eq!(1, nodes.len());

            let children = paragraph_with_blockquote_with_children(&nodes[0], 3);
            paragraph_with_single_text(&children[0], "hello world");
            paragraph_with_single_text(&children[1], "another paragraph");
            paragraph_with_single_text(&children[2], "third paragraph");
        }
        {
            let nodes = build(
                "opening paragraph
        :blockquote(
        quoted paragraph 1
        quoted paragraph 2
        )
        closing paragraph",
            );

            assert_eq!(3, nodes.len());

            paragraph_with_single_text(&nodes[0], "opening paragraph");
            let children = paragraph_with_blockquote_with_children(&nodes[1], 2);
            paragraph_with_single_text(&children[0], "quoted paragraph 1");
            paragraph_with_single_text(&children[1], "quoted paragraph 2");
            paragraph_with_single_text(&nodes[2], "closing paragraph");
        }
    }

    #[test]
    fn test_parsing_paragraphs() {
        let nodes = build(
            "hello world

:-

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
            ":h2(A header)

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
            let nodes = build(":h2(A header)");
            assert_eq!(1, nodes.len());
            header_with_single_text(&nodes[0], 2, "A header");
        }
        {
            let nodes = build(":h3(A header (with parentheses))");
            assert_eq!(1, nodes.len());
            header_with_multi_text(&nodes[0], 3, "A header (with parentheses)");
        }
        {
            // even though this header starts with a 1. it shouldn't
            // be treated as a numbered list
            //
            let nodes = build(":h2(1. A header)");
            assert_eq!(1, nodes.len());
            header_with_single_text(&nodes[0], 2, "1. A header");
        }
    }

    #[test]
    fn test_offset_bug() {
        let nodes = build(
            "For years, the political scientist has claimed that Putin’s aggression toward Ukraine is caused by Western intervention. Have recent events changed his mind?
:-",
        );
        assert_eq!(2, nodes.len());

        paragraph_with_single_text(&nodes[0], "For years, the political scientist has claimed that Putin’s aggression toward Ukraine is caused by Western intervention. Have recent events changed his mind?");
        assert_horizontal_ruleloc(&nodes[1], 158);
    }

    #[test]
    fn test_parsing_bug() {
        // the parse function skipped leading whitespace and newlines
        // at the start of the loop, should have been at the end.
        //
        let s = ":img(abc.jpeg)
";
        let nodes = build(s);
        dbg!(&nodes);
        assert_eq!(1, nodes.len());
    }

    #[test]
    fn test_sidenote_colon_syntax_bug() {
        let s = "hello |:url(http://google.com)|world";
        let nodes = build(s);
        dbg!("{:?}", &nodes);
        assert_eq!(1, nodes.len());
    }

    #[test]
    fn test_weird_unicode_bug() {
        // E2 80 8A: This sequence represents a single character in UTF-8 encoding,
        // specifically the Hair Space (U+200A), which is a very narrow space.
        //
        let s = ".  In the same book";
        let nodes = build(s);
        dbg!("{:?}", &nodes);
        assert_eq!(1, nodes.len());
    }

    #[test]
    fn test_colon_syntax_bug() {
        // the space inbetween the colon and the newline would result
        // in an infinite loop.
        //
        let s = "hello: \n:blockquote(\nhi\n)\n";
        let nodes = build(s);
        assert_eq!(2, nodes.len());

        let paragraph = &nodes[0];
        assert_paragraph(paragraph);
        let children = paragraph_children(paragraph).unwrap();
        assert_eq!(children.len(), 2);
        assert_text(&children[0], "hello");
        assert_text(&children[1], ": ");

        let children = paragraph_with_blockquote_with_children(&nodes[1], 1);
        paragraph_with_single_text(&children[0], "hi");
    }
}
