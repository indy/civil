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

use crate::element::Element;
use crate::error::Result;
use crate::parser::{CodeblockLanguage, Node};

use std::fmt::Write;

pub fn compile_to_struct(nodes: &[Node]) -> Result<Vec<Element>> {
    let mut res: Vec<Element> = Vec::new();

    for (i, n) in nodes.iter().enumerate() {
        res.append(&mut compile_node_to_struct(n, i)?);
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
                    children: vec![Element {
                        name: String::from("text"),
                        text: Some(String::from(code)),
                        ..Default::default()
                   }],
                    ..Default::default()
                }],
                ..Default::default()
            }]
        }
        Node::Highlight(ns) => element_key("mark", key, ns)?,
        Node::ListItem(ns) => element_key("li", key, ns)?,
        Node::Scribblenote(ns) => compile_sidenote(ns, key, "scribblenote")?,
        Node::Marginnote(ns) => compile_sidenote(ns, key, "marginnote")?,
        Node::OrderedList(ns) => element_key("ol", key, ns)?,
        Node::Paragraph(ns) => element_key("p", key, ns)?,
        Node::Quotation(ns) => element_key("em", key, ns)?,
        Node::NumberedSidenote(ns) => compile_numbered_sidenote(ns, key)?,
        Node::Strong(ns) => element_key("strong", key, ns)?,
        Node::Text(text) => vec![Element {
            name: String::from("text"),
            text: Some(String::from(text)),
            ..Default::default()
        }],
        Node::Image(src) => vec![Element {
            name: String::from("img"),
            src: Some(String::from(src)),
            ..Default::default()
        }],
        Node::Underlined(ns) => element_key_class("span", key, "underlined", ns)?,
        Node::UnorderedList(ns) => element_key("ul", key, ns)?,
        Node::Url(url, ns) => element_key_class_href("a", key, "note-inline-link", url, ns)?,
        Node::HR => element_key("hr", key, &vec![])?,
        Node::Header(ns) => element_key("h2", key, ns)?,
    };

    Ok(res)
}

fn compile_sidenote(ns: &[Node], key: usize, class_name: &str) -> Result<Vec<Element>> {
    let mut res: Vec<Element> = vec![];

    let mut id = String::new();
    write!(&mut id, "mn-{}", key)?;

    // the margin-toggle character is 'circled times': https://www.htmlsymbols.xyz/unicode/U+2297
    res.append(&mut element_key_class_for("label", key, "margin-toggle", &id, &"⊗")?);
    res.append(&mut element_key_class_type(
        "input",
        key + 100,
        "margin-toggle",
        &id,
        "checkbox",
    )?);
    res.append(&mut element_key_class("span", key + 200, class_name, ns)?);

    Ok(res)
}


fn compile_numbered_sidenote(ns: &[Node], key: usize) -> Result<Vec<Element>> {
    let mut res: Vec<Element> = vec![];

    let mut id = String::new();
    write!(&mut id, "sn-{}", key)?;

    res.append(&mut element_key_class_for(
        "label",
        key,
        "margin-toggle sidenote-number",
        &id,
        &"",
    )?);
    res.append(&mut element_key_class_type(
        "input",
        key + 100,
        "margin-toggle",
        &id,
        "checkbox",
    )?);
    res.append(&mut element_key_class("span", key + 200, "sidenote", ns)?);

    Ok(res)
}

fn element_key(name: &str, key: usize, ns: &[Node]) -> Result<Vec<Element>> {
    let e = element_base(name, key, ns)?;

    Ok(vec![e])
}

fn text_element(text: &str) -> Element {
    Element {
        name: String::from("text"),
        text: Some(String::from(text)),
        ..Default::default()
    }
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
    e.children = vec![text_element(text)];

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
