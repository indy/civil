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
use crate::parser::{ColourPalette, MarginTextLabel, Node};

use std::fmt::Write;

pub fn compile_to_struct(nodes: &[Node], note_id: usize) -> crate::Result<Vec<Element>> {
    let mut res: Vec<Element> = Vec::new();

    for (i, n) in nodes.iter().enumerate() {
        res.append(&mut compile_node_to_struct(n, i, note_id)?);
    }

    Ok(res)
}

fn compile_node_to_struct(node: &Node, key: usize, note_id: usize) -> crate::Result<Vec<Element>> {
    let res = match node {
        Node::BlockQuote(_, ns) => element("blockquote", key, note_id, ns)?,
        Node::ColouredText(_, col, ns) => coloured_text(col, key, note_id, ns)?,
        Node::Codeblock(_, code) => {
            vec![Element {
                name: String::from("pre"),
                key: Some(key),
                children: vec![Element {
                    name: String::from("code"),
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
        Node::Deleted(_, ns) => element_hoisted("del", key, note_id, ns)?,
        Node::Header(_, level, ns) => header_key(*level, key, note_id, ns)?,
        Node::Highlight(_, col, ns) => coloured_highlight(col, key, note_id, ns)?,
        Node::HorizontalRule(_) => element_class("hr", "hr-inline", key, note_id, &[])?,
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
                let mut figcaption = element_hoisted("figcaption", key, note_id, ns)?;
                let mut figure_children = vec![img];

                figure_children.append(&mut figcaption);

                vec![Element {
                    name: String::from("figure"),
                    children: figure_children,
                    ..Default::default()
                }]
            }
        }
        Node::Italic(_, ns) => element_hoisted("i", key, note_id, ns)?,
        Node::ListItem(_, ns) => element("li", key, note_id, ns)?,
        Node::MarginComment(offset, ns) => {
            compile_sidenote("right-margin-scribble fg-blue", key, note_id, ns, *offset)?
        }
        Node::MarginDisagree(offset, ns) => {
            compile_sidenote("right-margin-scribble fg-red", key, note_id, ns, *offset)?
        }
        Node::MarginText(offset, numbered, ns) => match numbered {
            MarginTextLabel::Numbered => compile_numbered_sidenote(key, note_id, ns, *offset)?,
            MarginTextLabel::UnNumbered => compile_sidenote("right-margin", key, note_id, ns, *offset)?,
        },
        Node::OrderedList(_, ns, start) => compile_ordered_list(start, key, note_id, ns)?,
        Node::Paragraph(_, ns) => element("p", key, note_id, ns)?,
        Node::Quotation(_, ns) => element_hoisted("em", key, note_id, ns)?,
        Node::Searched(_, ns) => element_hoisted_class("span", "searched-text", key, note_id, ns)?,
        Node::Strong(_, ns) => element_hoisted("strong", key, note_id, ns)?,
        Node::Subscript(_, ns) => element_hoisted("sub", key, note_id, ns)?,
        Node::Superscript(_, ns) => element_hoisted("sup", key, note_id, ns)?,
        Node::Text(_, text) => vec![Element {
            name: String::from("text"),
            text: Some(String::from(text)),
            ..Default::default()
        }],
        Node::Underlined(_, ns) => element_hoisted_class("span", "underlined", key, note_id, ns)?,
        Node::UnorderedList(_, ns) => element("ul", key, note_id, ns)?,
        Node::Url(_, url, ns) => element_href("a", url, key, note_id, ns)?,
        Node::YouTube(_, id, start) => element_youtube("youtube", key, id, start)?,
    };

    Ok(res)
}

fn compile_sidenote(
    class_name: &str,
    key: usize,
    note_id: usize,
    ns: &[Node],
    unique: usize,
) -> crate::Result<Vec<Element>> {
    let mut res: Vec<Element> = vec![];

    let mut id = String::new();
    write!(&mut id, "sidenote-{note_id}-{unique}")?;

    // the right-margin-toggle character is 'circled times': https://www.htmlsymbols.xyz/unicode/U+2297
    res.append(&mut element_class_for(
        "label",
        key,
        "right-margin-toggle",
        &id,
        "⊗",
        note_id,
    )?);
    res.append(&mut element_class_type(
        "input",
        key + 100,
        "right-margin-toggle",
        &id,
        "checkbox",
        note_id,
    )?);
    res.append(&mut element_class("span", class_name, key + 200, note_id, ns)?);

    Ok(res)
}

fn compile_numbered_sidenote(key: usize, note_id: usize, ns: &[Node], unique: usize) -> crate::Result<Vec<Element>> {
    let mut res: Vec<Element> = vec![];

    let mut id = String::new();
    write!(&mut id, "numbered-sidenote-{note_id}-{unique}")?;

    res.append(&mut element_class_for(
        "label",
        key,
        "right-margin-toggle right-margin-number",
        &id,
        "",
        note_id,
    )?);
    res.append(&mut element_class_type(
        "input",
        key + 100,
        "right-margin-toggle",
        &id,
        "checkbox",
        note_id,
    )?);
    res.append(&mut element_class(
        "span",
        "right-margin-numbered",
        key + 200,
        note_id,
        ns,
    )?);

    Ok(res)
}

fn compile_ordered_list(start: &String, key: usize, note_id: usize, ns: &[Node]) -> crate::Result<Vec<Element>> {
    let name = "ol".to_string();
    let mut e = base_element(&name, key, note_id, ns)?;

    e.start = Some(start.to_string());

    Ok(vec![e])
}

fn element(name: &str, key: usize, note_id: usize, ns: &[Node]) -> crate::Result<Vec<Element>> {
    let e = base_element(name, key, note_id, ns)?;

    Ok(vec![e])
}

fn coloured_highlight(col: &ColourPalette, key: usize, note_id: usize, ns: &[Node]) -> crate::Result<Vec<Element>> {
    let class = match col {
        ColourPalette::Red => "bg-hi-red",
        ColourPalette::Green => "bg-hi-green",
        ColourPalette::Blue => "bg-hi-blue",
        ColourPalette::Yellow => "bg-hi-yellow",
        ColourPalette::Orange => "bg-hi-orange",
        ColourPalette::Pink => "bg-hi-pink",
        ColourPalette::Purple => "bg-hi-purple",
    };
    element_hoisted_class("mark", class, key, note_id, ns)
}

fn coloured_text(col: &ColourPalette, key: usize, note_id: usize, ns: &[Node]) -> crate::Result<Vec<Element>> {
    let class = match col {
        ColourPalette::Red => "fg-red",
        ColourPalette::Green => "fg-green",
        ColourPalette::Blue => "fg-blue",
        ColourPalette::Yellow => "fg-yellow",
        ColourPalette::Orange => "fg-orange",
        ColourPalette::Pink => "fg-pink",
        ColourPalette::Purple => "fg-purple",
    };
    element_hoisted_class("span", class, key, note_id, ns)
}

fn element_hoisted(name: &str, key: usize, note_id: usize, ns: &[Node]) -> crate::Result<Vec<Element>> {
    let e = base_element_hoisted(name, key, note_id, ns)?;

    Ok(vec![e])
}

fn header_key(level: u32, key: usize, note_id: usize, ns: &[Node]) -> crate::Result<Vec<Element>> {
    element_hoisted(&format!("h{}", level), key, note_id, ns)
}

fn element_text(text: &str) -> Element {
    Element {
        name: String::from("text"),
        text: Some(String::from(text)),
        ..Default::default()
    }
}

fn element_class(name: &str, class_name: &str, key: usize, note_id: usize, ns: &[Node]) -> crate::Result<Vec<Element>> {
    let mut e = base_element(name, key, note_id, ns)?;

    e.class_name = Some(String::from(class_name));

    Ok(vec![e])
}

fn element_hoisted_class(
    name: &str,
    class_name: &str,
    key: usize,
    note_id: usize,
    ns: &[Node],
) -> crate::Result<Vec<Element>> {
    let mut e = base_element_hoisted(name, key, note_id, ns)?;

    e.class_name = Some(String::from(class_name));

    Ok(vec![e])
}

fn element_href(name: &str, url: &str, key: usize, note_id: usize, ns: &[Node]) -> crate::Result<Vec<Element>> {
    let mut e = base_element_hoisted(name, key, note_id, ns)?;

    e.href = Some(String::from(url));

    Ok(vec![e])
}

fn element_class_for(
    name: &str,
    key: usize,
    class_name: &str,
    html_for: &str,
    text: &str,
    note_id: usize,
) -> crate::Result<Vec<Element>> {
    let mut e = base_element(name, key, note_id, &[])?;

    e.class_name = Some(String::from(class_name));
    e.html_for = Some(String::from(html_for));
    // e.text = Some(String::from(text));
    e.children = vec![element_text(text)];

    Ok(vec![e])
}

fn element_class_type(
    name: &str,
    key: usize,
    class_name: &str,
    id: &str,
    html_type: &str,
    note_id: usize,
) -> crate::Result<Vec<Element>> {
    let mut e = base_element(name, key, note_id, &[])?;

    e.class_name = Some(String::from(class_name));
    e.id = Some(String::from(id));
    e.html_type = Some(String::from(html_type));

    Ok(vec![e])
}

fn element_youtube(name: &str, key: usize, id: &str, start: &str) -> crate::Result<Vec<Element>> {
    Ok(vec![Element {
        name: String::from(name),
        key: Some(key),
        children: vec![],
        id: Some(String::from(id)),
        start: Some(String::from(start)),
        ..Default::default()
    }])
}

fn base_element(name: &str, key: usize, note_id: usize, ns: &[Node]) -> crate::Result<Element> {
    Ok(Element {
        name: String::from(name),
        key: Some(key),
        children: if ns.is_empty() {
            vec![]
        } else {
            compile_to_struct(ns, note_id)?
        },
        ..Default::default()
    })
}

// after parsing, a lot of nodes will have 1 child which is a paragraph
// (e.g. bold, italic, headings). this fn hoists the children from the
// inbetween paragraph up into the base element
//
fn base_element_hoisted(name: &str, key: usize, note_id: usize, ns: &[Node]) -> crate::Result<Element> {
    if ns.len() == 1 {
        match &ns[0] {
            Node::Paragraph(_, pns) => Ok(Element {
                name: String::from(name),
                key: Some(key),
                children: if pns.is_empty() {
                    vec![]
                } else {
                    compile_to_struct(pns, note_id)?
                },
                ..Default::default()
            }),
            _ => Ok(Element {
                name: String::from(name),
                key: Some(key),
                children: if ns.is_empty() {
                    vec![]
                } else {
                    compile_to_struct(ns, note_id)?
                },
                ..Default::default()
            }),
        }
    } else {
        Ok(Element {
            name: String::from(name),
            key: Some(key),
            children: if ns.is_empty() {
                vec![]
            } else {
                compile_to_struct(ns, note_id)?
            },
            ..Default::default()
        })
    }
}
