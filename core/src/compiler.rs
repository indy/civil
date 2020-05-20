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
use crate::element::Element;
use crate::parser::{CodeblockLanguage, Node};

use std::fmt::Write;

pub fn compile_to_struct(nodes: &[Node]) -> Result<Vec<Element>> {
    let mut res: Vec<Element> = Vec::new();

    for (i, n) in nodes.iter().enumerate() {
        res.append(&mut compile_node_to_struct(n, i)?);
    }

    Ok(res)
}

pub fn compile_to_string(nodes: &[Node]) -> Result<String> {
    let mut res: String = "".to_string();

    for (i, n) in nodes.iter().enumerate() {
        res += &compile_node_to_string(n, i)?;
    }

    Ok(res)
}

fn compile_node_to_struct(node: &Node, key: usize) -> Result<Vec<Element>> {
    let res = match node {
        Node::Codeblock(lang, code) => {
            let lang = if let Some(lang) = lang {
                match lang {
                    CodeblockLanguage::Rust => "rust",
                }
            } else {
                "unspecified"
            };

            vec![Element {
                name: String::from("pre"),
                key: Some(key),
                children: vec![Element {
                    name: String::from("code"),
                    class_name: Some(String::from(lang)),
                    text: Some(String::from(code)),
                    ..Default::default()
                }],
                ..Default::default()
            }]
        }
        Node::Highlight(ns) => element_key_class("mark", key, "highlight", ns)?,
        Node::ScribbledOut(ns) => element_key_class("mark", key, "scribbled-out", ns)?,
        Node::Link(url, ns) => element_key_class_href("a", key, "note-inline-link", url, ns)?,
        Node::ListItem(ns) => element_key("li", key, ns)?,
        Node::Marginnote(ns) => compile_marginnote_to_struct(ns, key)?,
        Node::OrderedList(ns) => element_key("ol", key, ns)?,
        Node::Paragraph(ns) => element_key("p", key, ns)?,
        Node::Quotation(ns) => element_key("em", key, ns)?,
        Node::Sidenote(ns) => compile_sidenote_to_struct(ns, key)?,
        Node::Strong(ns) => element_key("strong", key, ns)?,
        Node::Text(text) => {
            vec![Element {
                name: String::from("text"),
                text: Some(String::from(text)),
                ..Default::default()
            }]
        },
        Node::Underlined(ns) => element_key_class("span", key, "underlined", ns)?,
        Node::UnorderedList(ns) => element_key("ul", key, ns)?,
    };

    Ok(res)
}

fn compile_marginnote_to_struct(ns: &[Node], key: usize) -> Result<Vec<Element>> {
    let mut res:Vec<Element> = vec![];

    let mut id = String::new();
    write!(&mut id, "mn-{}", key)?;

    // the margin-toggle character is 'circled times': https://www.htmlsymbols.xyz/unicode/U+2297
    res.append(&mut element_key_class_for("label", key, "margin-toggle", &id, &"⊗")?);
    res.append(&mut element_key_class_type("input", key + 1, "margin-toggle", &id, "checkbox")?);
    res.append(&mut element_key_class("span", key + 2, "marginnote", ns)?);

    Ok(res)
}

fn compile_sidenote_to_struct(ns: &[Node], key: usize) -> Result<Vec<Element>> {
    let mut res:Vec<Element> = vec![];

    let mut id = String::new();
    write!(&mut id, "sn-{}", key)?;

    res.append(&mut element_key_class_for("label", key, "margin-toggle sidenote-number", &id, &"")?);
    res.append(&mut element_key_class_type("input", key + 1, "margin-toggle", &id, "checkbox")?);
    res.append(&mut element_key_class("span", key + 2, "sidenote", ns)?);

    Ok(res)
}

fn element_key(name: &str, key: usize, ns: &[Node]) -> Result<Vec<Element>> {
    let e = element_base(name, key, ns)?;

    Ok(vec![e])
}

fn element_key_class(name: &str, key: usize, class_name: &str, ns: &[Node]) -> Result<Vec<Element>> {
    let mut e = element_base(name, key, ns)?;

    e.class_name = Some(String::from(class_name));

    Ok(vec![e])
}

fn element_key_class_href(name: &str, key: usize, class_name: &str, url: &str, ns: &[Node]) -> Result<Vec<Element>> {
    let mut e = element_base(name, key, ns)?;

    e.class_name = Some(String::from(class_name));
    e.href = Some(String::from(url));

    Ok(vec![e])
}

fn element_key_class_for(name: &str, key: usize, class_name: &str, html_for: &str, text: &str) -> Result<Vec<Element>> {
    let mut e = element_base(name, key, &[])?;

    e.class_name = Some(String::from(class_name));
    e.html_for = Some(String::from(html_for));
    // e.text = Some(String::from(text));
    e.children = vec![Element {
        name: String::from("text"),
        text: Some(String::from(text)),
        ..Default::default()
    }];

    Ok(vec![e])
}

fn element_key_class_type(name: &str, key: usize, class_name: &str, id: &str, html_type: &str) -> Result<Vec<Element>> {
    let mut e = element_base(name, key, &[])?;

    e.class_name = Some(String::from(class_name));
    e.id = Some(String::from(id));
    e.html_type = Some(String::from(html_type));

    Ok(vec![e])
}

fn element_base(name: &str, key: usize, ns: &[Node]) -> Result<Element> {
    Ok(Element {
        name: String::from(name),
        key: Some(key),
        children: if ns.is_empty() { vec![] } else { compile_to_struct(ns)? },
        ..Default::default()
    })
}

fn compile_node_to_string(node: &Node, key: usize) -> Result<String> {
    let mut s = String::new();

    let res = match node {
        Node::Codeblock(lang, code) => {
            let lang = if let Some(lang) = lang {
                match lang {
                    CodeblockLanguage::Rust => "rust",
                }
            } else {
                "unspecified"
            };
            write!(&mut s, "<pre key={}><code class={}>{}</code></pre>", key, lang, code)?;
            s
        }
        Node::Highlight(ns) => {
            write!(&mut s, "<mark key={} class={}>{}</mark>", key, "highlight", compile_to_string(ns)?)?;
            s
        }
        Node::ScribbledOut(ns) => {
            write!(&mut s, "<mark key={} class={}>{}</mark>", key, "scribbled-out", compile_to_string(ns)?)?;
            s
        }
        Node::Link(url, ns) => {
            write!(&mut s, "<a key={} class={} href=\"{}\">{}</a>", key, "note-inline-link", url, compile_to_string(ns)?)?;
            s
        }
        Node::ListItem(ns) => {
            write!(&mut s, "<li key={}>{}</li>", key, compile_to_string(ns)?)?;
            s
        }
        Node::Marginnote(ns) => compile_marginnote_to_string(ns, key)?,
        Node::OrderedList(ns) => {
            write!(&mut s, "<ol key={}>{}</ol>", key, compile_to_string(ns)?)?;
            s
        }
        Node::Paragraph(ns) => {
            write!(&mut s, "<p key={}>{}</p>", key, compile_to_string(ns)?)?;
            s
        }
        Node::Quotation(ns) => {
            write!(&mut s, "<em key={}>{}</em>", key, compile_to_string(ns)?)?;
            s
        }
        Node::Sidenote(ns) => compile_sidenote_to_string(ns, key)?,
        Node::Strong(ns) => {
            write!(&mut s, "<strong key={}>{}</strong>", key, compile_to_string(ns)?)?;
            s
        }
        Node::Text(text) => text.to_string(),
        Node::Underlined(ns) => {
            write!(
                &mut s,
                "<span class=\"underlined\" key={}>{}</span>",
                key,
                compile_to_string(ns)?
            )?;
            s
        }
        Node::UnorderedList(ns) => {
            write!(&mut s, "<ul key={}>{}</ul>", key, compile_to_string(ns)?)?;
            s
        }
    };

    Ok(res)
}

fn compile_sidenote_to_string(nodes: &[Node], key: usize) -> Result<String> {
    let mut id = String::new();
    write!(&mut id, "sn-{}", key)?;

    let mut label = String::new();
    write!(
        &mut label,
        "<label key={} class=\"margin-toggle sidenote-number\" htmlFor=\"{}\"></label>",
        key, id
    )?;

    let mut input = String::new();
    write!(
        &mut input,
        "<input key={} type=\"checkbox\" id={} class=\"margin-toggle\"/>",
        key + 1,
        id
    )?;

    let mut span = String::new();
    write!(
        &mut span,
        "<span key={} class=\"sidenote\">{}</span>",
        key + 2,
        compile_to_string(nodes)?
    )?;

    Ok(label + &input + &span)
}

fn compile_marginnote_to_string(nodes: &[Node], key: usize) -> Result<String> {
    let mut id = String::new();
    write!(&mut id, "mn-{}", key)?;

    let mut label = String::new();
    write!(
        &mut label,
        "<label key={} class=\"margin-toggle\" htmlFor=\"{}\">&#8855;</label>",
        key, id
    )?;

    let mut input = String::new();
    write!(
        &mut input,
        "<input key={} type=\"checkbox\" id={} class=\"margin-toggle\"/>",
        key + 1,
        id
    )?;

    let mut span = String::new();
    write!(
        &mut span,
        "<span key={} class=\"marginnote\">{}</span>",
        key + 2,
        compile_to_string(nodes)?
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
        compile_to_string(&nodes).unwrap()
    }

    #[test]
    fn test_test() {
        let r = build("hello world");
        assert_eq!(r, "<p key=0>hello world</p>");
    }
}
