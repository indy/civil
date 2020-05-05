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

use crate::error::Result;
use crate::parser::Node;

use std::fmt::Write;

pub fn compile(nodes: &Vec<Node>) -> Result<String> {
    let mut res: String = "".to_string();

    for (i, n) in nodes.iter().enumerate() {
        res += &compile_node(n, i)?;
    }

    Ok(res)
}

fn compile_node(node: &Node, key: usize) -> Result<String> {
    let mut s = String::new();

    let res = match node {
        Node::Codeblock(_lang, code) => {
            write!(&mut s, "<pre key={}><code className={}>{}</code></pre>", key, "", code)?;
            s
        }
        Node::Highlight(ns) => {
            write!(&mut s, "<mark key={}>{}</mark>", key, compile(ns)?)?;
            s
        }
        Node::Link(url, ns) => {
            write!(&mut s, "<a key={} href=\"{}\">{}</a>", key, url, compile(ns)?)?;
            s
        }
        Node::ListItem(ns) => {
            write!(&mut s, "<li key={}>{}</li>", key, compile(ns)?)?;
            s
        }
        Node::Marginnote(ns) => compile_marginnote(ns, key)?,
        Node::OrderedList(ns) => {
            write!(&mut s, "<ol key={}>{}</ol>", key, compile(ns)?)?;
            s
        }
        Node::Paragraph(ns) => {
            write!(&mut s, "<p key={}>{}</p>", key, compile(ns)?)?;
            s
        }
        Node::Quotation(ns) => {
            write!(&mut s, "<em key={}>{}</em>", key, compile(ns)?)?;
            s
        }
        Node::Sidenote(ns) => compile_sidenote(ns, key)?,
        Node::Strong(ns) => {
            write!(&mut s, "<strong key={}>{}</strong>", key, compile(ns)?)?;
            s
        }
        Node::Text(text) => text.to_string(),
        Node::Underlined(ns) => {
            write!(
                &mut s,
                "<span className=\"underlined\" key={}>{}</span>",
                key,
                compile(ns)?
            )?;
            s
        }
        Node::UnorderedList(ns) => {
            write!(&mut s, "<ul key={}>{}</ul>", key, compile(ns)?)?;
            s
        }
    };

    Ok(res.to_string())
}

fn compile_sidenote(nodes: &Vec<Node>, key: usize) -> Result<String> {
    let mut id = String::new();
    write!(&mut id, "sn-{}", key)?;

    let mut label = String::new();
    write!(
        &mut label,
        "<label key={} className=\"margin-toggle sidenote-number\" htmlFor=\"{}\"></label>",
        key, id
    )?;

    let mut input = String::new();
    write!(
        &mut input,
        "<input key={} type=\"checkbox\" id={} className=\"margin-toggle\"/>",
        key + 1,
        id
    )?;

    let mut span = String::new();
    write!(
        &mut span,
        "<span key={} className=\"sidenote\">{}</span>",
        key + 2,
        compile(nodes)?
    )?;

    Ok(label + &input + &span)
}

fn compile_marginnote(nodes: &Vec<Node>, key: usize) -> Result<String> {
    let mut id = String::new();
    write!(&mut id, "mn-{}", key)?;

    let mut label = String::new();
    write!(
        &mut label,
        "<label key={} className=\"margin-toggle sidenote-number\" htmlFor=\"{}\">&#8855;</label>",
        key, id
    )?;

    let mut input = String::new();
    write!(
        &mut input,
        "<input key={} type=\"checkbox\" id={} className=\"margin-toggle\"/>",
        key + 1,
        id
    )?;

    let mut span = String::new();
    write!(
        &mut span,
        "<span key={} className=\"marginnote\">{}</span>",
        key + 2,
        compile(nodes)?
    )?;

    Ok(label + &input + &span)
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::lexer::tokenize;
    use crate::parser::parse;

    fn build(s: &'static str) -> String {
        let toks = tokenize(s).unwrap();
        let nodes = parse(toks).unwrap();
        let c = compile(&nodes).unwrap();
        c
    }

    #[test]
    fn test_test() {
        let r = build("hello world");
        assert_eq!(r, "<p key=0>hello world</p>");
    }
}
