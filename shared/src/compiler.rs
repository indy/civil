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

use crate::element::Element;
use crate::error::Result;
use crate::parser::{CodeblockLanguage, MarginTextLabel, Node};

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
        Node::Codeblock(_, lang, code) => {
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
        Node::BlockQuote(_, ns) => element_key("blockquote", key, ns)?,
        Node::Header(_, level, ns) => header_key(*level, key, ns)?,
        Node::Highlight(_, ns) => element_key_hoisted("mark", key, ns)?,
        Node::HorizontalRule(_) => element_key("hr", key, &[])?,
        Node::Image(_, src, ns) => {
            let img = Element {
                name: String::from("img"),
                src: Some(String::from(src)),
                ..Default::default()
            };

            if ns.is_empty() {
                vec![img]
            } else {
                // if there is a text description provided then treat this as a figure
                // <figure><img/><figcaption>ns contents</figcaption></figure>
                let mut figcaption = element_key_hoisted("figcaption", key, ns)?;
                let mut figure_children = vec![img];

                figure_children.append(&mut figcaption);

                vec![Element {
                    name: String::from("figure"),
                    children: figure_children,
                    ..Default::default()
                }]
            }
        },
        Node::Italic(_, ns) => element_key_hoisted("i", key, ns)?,
        Node::ListItem(_, ns) => element_key("li", key, ns)?,
        Node::MarginScribble(_, ns) => compile_sidenote("right-margin-scribble scribble-neutral", key, ns)?,
        Node::MarginDisagree(_, ns) => compile_sidenote("right-margin-scribble scribble-disagree", key, ns)?,
        Node::MarginText(_, numbered, ns) => match numbered {
            MarginTextLabel::Numbered => compile_numbered_sidenote(key, ns)?,
            MarginTextLabel::UnNumbered => compile_sidenote("right-margin", key, ns)?,
        },
        Node::OrderedList(_, ns, start) => compile_ordered_list(start, key, ns)?,
        Node::Paragraph(_, ns) => element_key("p", key, ns)?,
        Node::Quotation(_, ns) => element_key_hoisted("em", key, ns)?,
        Node::Strong(_, ns) => element_key_hoisted("strong", key, ns)?,
        Node::Text(_, text) => vec![Element {
            name: String::from("text"),
            text: Some(String::from(text)),
            ..Default::default()
        }],
        Node::Underlined(_, ns) => element_key_hoisted_class("span", "underlined", key, ns)?,
        Node::UnorderedList(_, ns) => element_key("ul", key, ns)?,
        Node::Url(_, url, ns) => element_key_class_href("a", "note-inline-link", url, key, ns)?,
    };

    Ok(res)
}

fn compile_sidenote(class_name: &str, key: usize, ns: &[Node]) -> Result<Vec<Element>> {
    let mut res: Vec<Element> = vec![];

    let mut id = String::new();
    write!(&mut id, "mn-{}", key)?;

    // the right-margin-toggle character is 'circled times': https://www.htmlsymbols.xyz/unicode/U+2297
    res.append(&mut element_key_class_for(
        "label",
        key,
        "right-margin-toggle",
        &id,
        "⊗",
    )?);
    res.append(&mut element_key_class_type(
        "input",
        key + 100,
        "right-margin-toggle",
        &id,
        "checkbox",
    )?);
    res.append(&mut element_key_class("span", class_name, key + 200, ns)?);

    Ok(res)
}

fn compile_numbered_sidenote(key: usize, ns: &[Node]) -> Result<Vec<Element>> {
    let mut res: Vec<Element> = vec![];

    let mut id = String::new();
    write!(&mut id, "sn-{}", key)?;

    res.append(&mut element_key_class_for(
        "label",
        key,
        "right-margin-toggle right-margin-number",
        &id,
        "",
    )?);
    res.append(&mut element_key_class_type(
        "input",
        key + 100,
        "right-margin-toggle",
        &id,
        "checkbox",
    )?);
    res.append(&mut element_key_class("span", "right-margin-note", key + 200, ns)?);

    Ok(res)
}

fn compile_ordered_list(start: &String, key: usize, ns: &[Node]) -> Result<Vec<Element>> {
    let name = "ol".to_string();
    let mut e = element_base(&name, key, ns)?;

    e.start = Some(start.to_string());

    Ok(vec![e])
}

fn element_key(name: &str, key: usize, ns: &[Node]) -> Result<Vec<Element>> {
    let e = element_base(name, key, ns)?;

    Ok(vec![e])
}

fn element_key_hoisted(name: &str, key: usize, ns: &[Node]) -> Result<Vec<Element>> {
    let e = element_base_hoisted(name, key, ns)?;

    Ok(vec![e])
}

fn header_key(level: u32, key: usize, ns: &[Node]) -> Result<Vec<Element>> {
    element_key_hoisted(&format!("h{}", level), key, ns)
}

fn text_element(text: &str) -> Element {
    Element {
        name: String::from("text"),
        text: Some(String::from(text)),
        ..Default::default()
    }
}

fn element_key_class(name: &str, class_name: &str, key: usize, ns: &[Node]) -> Result<Vec<Element>> {
    let mut e = element_base(name, key, ns)?;

    e.class_name = Some(String::from(class_name));

    Ok(vec![e])
}

fn element_key_hoisted_class(name: &str, class_name: &str, key: usize, ns: &[Node]) -> Result<Vec<Element>> {
    let mut e = element_base_hoisted(name, key, ns)?;

    e.class_name = Some(String::from(class_name));

    Ok(vec![e])
}

fn element_key_class_href(name: &str, class_name: &str, url: &str, key: usize, ns: &[Node]) -> Result<Vec<Element>> {
    let mut e = element_base_hoisted(name, key, ns)?;

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

// after parsing, a lot of nodes will have 1 child which is a paragraph
// (e.g. bold, italic, headings). this fn hoists the children from the
// inbetween paragraph up into the base element
//
fn element_base_hoisted(name: &str, key: usize, ns: &[Node]) -> Result<Element> {
    if ns.len() == 1 {
        match &ns[0] {
            Node::Paragraph(_, pns) => Ok(Element {
                name: String::from(name),
                key: Some(key),
                children: if pns.is_empty() {
                    vec![]
                } else {
                    compile_to_struct(pns)?
                },
                ..Default::default()
            }),
            _ => Ok(Element {
                name: String::from(name),
                key: Some(key),
                children: if ns.is_empty() { vec![] } else { compile_to_struct(ns)? },
                ..Default::default()
            }),
        }
    } else {
        Ok(Element {
            name: String::from(name),
            key: Some(key),
            children: if ns.is_empty() { vec![] } else { compile_to_struct(ns)? },
            ..Default::default()
        })
    }
}
