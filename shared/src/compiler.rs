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

    for n in nodes.iter() {
        res.append(&mut compile_node_to_struct(n, note_id)?);
    }

    Ok(res)
}

fn compile_node_to_struct(node: &Node, note_id: usize) -> crate::Result<Vec<Element>> {
    // note: the node offset is being re-used as the element key

    let res = match node {
        Node::BlockQuote(key, ns) => element("blockquote", *key, note_id, ns)?,
        Node::ColouredText(key, col, ns) => coloured_text(col, *key, note_id, ns)?,
        Node::Codeblock(key, code) => {
            vec![Element {
                name: String::from("pre"),
                key: Some(*key),
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
        Node::Deleted(key, ns) => element_hoisted("del", *key, note_id, ns)?,
        Node::Diagram(_key, src, ns) => {
            let img = Element {
                name: String::from("img"),
                src: Some(String::from(src)),
                ..Default::default()
            };

            if ns.is_empty() {
                vec![img]
            } else {
                let mut image_and_code = vec![img];
                let code = compile_to_struct(ns, note_id)?;
                image_and_code.extend(code);
                image_and_code
            }
        }
        Node::DoubleQuotedText(key, ns) => element_hoisted("em", *key, note_id, ns)?,
        Node::Header(key, level, ns) => header_key(*level, *key, note_id, ns)?,
        Node::Highlight(key, col, ns) => coloured_highlight(col, *key, note_id, ns)?,
        Node::HorizontalRule(key) => element_class("hr", "hr-inline", *key, note_id, &[])?,
        Node::Image(key, src, ns) => {
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
                let mut figcaption = element_hoisted("figcaption", *key, note_id, ns)?;
                let mut figure_children = vec![img];

                figure_children.append(&mut figcaption);

                vec![Element {
                    name: String::from("figure"),
                    children: figure_children,
                    ..Default::default()
                }]
            }
        }
        Node::Italic(key, ns) => element_hoisted("i", *key, note_id, ns)?,
        Node::ListItem(key, ns) => element("li", *key, note_id, ns)?,
        Node::MarginComment(key, ns) => compile_sidenote("right-margin-scribble fg-blue", *key, note_id, ns)?,
        Node::MarginDisagree(key, ns) => compile_sidenote("right-margin-scribble fg-red", *key, note_id, ns)?,
        Node::MarginText(key, numbered, ns) => match numbered {
            MarginTextLabel::Numbered => compile_numbered_sidenote(*key, note_id, ns)?,
            MarginTextLabel::UnNumbered => compile_sidenote("right-margin", *key, note_id, ns)?,
        },
        Node::OrderedList(key, ns, start) => compile_ordered_list(start, *key, note_id, ns)?,
        Node::Paragraph(key, ns) => element("p", *key, note_id, ns)?,
        Node::Quotation(key, quote_ns, attribution_ns) => quotation(*key, note_id, quote_ns, attribution_ns)?,
        Node::Searched(key, ns) => element_hoisted_class("span", "searched-text", *key, note_id, ns)?,
        Node::Strong(key, ns) => element_hoisted("strong", *key, note_id, ns)?,
        Node::Subscript(key, ns) => element_hoisted("sub", *key, note_id, ns)?,
        Node::Superscript(key, ns) => element_hoisted("sup", *key, note_id, ns)?,
        Node::Text(_, text) => vec![Element {
            name: String::from("text"),
            text: Some(String::from(text)),
            ..Default::default()
        }],
        Node::Underlined(key, ns) => element_hoisted_class("span", "underlined", *key, note_id, ns)?,
        Node::UnorderedList(key, ns) => element("ul", *key, note_id, ns)?,
        Node::Url(key, url, ns) => element_href("a", url, *key, note_id, ns)?,
        Node::YouTube(key, id, start) => element_youtube("youtube", *key, id, start)?,
    };

    Ok(res)
}

fn compile_sidenote(class_name: &str, key: usize, note_id: usize, ns: &[Node]) -> crate::Result<Vec<Element>> {
    let mut res: Vec<Element> = vec![];

    let mut id = String::new();
    write!(&mut id, "sidenote-{note_id}-{key}")?;

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
        key + 1,
        "right-margin-toggle",
        &id,
        "checkbox",
        note_id,
    )?);
    res.append(&mut element_class("span", class_name, key + 2, note_id, ns)?);

    Ok(res)
}

fn compile_numbered_sidenote(key: usize, note_id: usize, ns: &[Node]) -> crate::Result<Vec<Element>> {
    let mut res: Vec<Element> = vec![];

    let mut id = String::new();
    write!(&mut id, "numbered-sidenote-{note_id}-{key}")?;

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
        key + 1,
        "right-margin-toggle",
        &id,
        "checkbox",
        note_id,
    )?);
    res.append(&mut element_class(
        "span",
        "right-margin-numbered",
        key + 2,
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

fn quotation(key: usize, note_id: usize, quote_ns: &[Node], attribution_ns: &[Node]) -> crate::Result<Vec<Element>> {
    let attribution_element = base_element_hoisted("cite", key, note_id, attribution_ns)?;
    let mut quote_element  = base_element("blockquote", key, note_id, quote_ns)?;
    quote_element.children.push(attribution_element);

    Ok(vec![quote_element])
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
            Node::Paragraph(key2, pns) => Ok(Element {
                name: String::from(name),
                key: Some(*key2),
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
