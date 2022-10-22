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

use civil_server::{
    db::notes::edit_note, interop::notes::NoteKind, interop::Key, note_parser_api, Result,
};
use std::cmp;

use r2d2_sqlite::SqliteConnectionManager;
use tracing::info;

#[actix_rt::main]
async fn main() -> Result<()> {
    civil_server::init_dotenv();
    civil_server::init_tracing();

    let sqlite_db = civil_server::env_var_string("SQLITE_DB")?;
    civil_server::db::sqlite_migrations::migration_check(&sqlite_db)?;

    let sqlite_manager = SqliteConnectionManager::file(&sqlite_db);
    let sqlite_pool = r2d2::Pool::new(sqlite_manager)?;

    info!("started parsing all note markup");
    let notes = note_parser_api::get_all_notes_in_db(&sqlite_pool)?;

    let mut num_elements: usize = 0;
    let mut c: usize = 0;

    for mut note in notes {
        if note.kind != NoteKind::NoteDeckMeta {
            let original_content = String::from(&note.content);
            // note.content = convert_syntax_highlight(note.id, &note.content);
            // note.content = convert_syntax_bold(note.id, &note.content);
            // // note.content = convert_syntax_underline(note.id, &note.content); // don't use this, too many false positives

            // // note: these are _really_ slow
            // note.content = convert_syntax_h1(note.id, &note.content);
            // note.content = convert_syntax_h2(note.id, &note.content);
            // note.content = convert_syntax_h3(note.id, &note.content);
            // note.content = convert_syntax_h4(note.id, &note.content);
            // note.content = convert_syntax_h5(note.id, &note.content);
            // note.content = convert_syntax_h6(note.id, &note.content);
            // note.content = convert_syntax_h7(note.id, &note.content);
            // note.content = convert_syntax_h8(note.id, &note.content);
            // note.content = convert_syntax_h9(note.id, &note.content);

            // if original_content != note.content {
            //     // info!("saving {}", note.id);
            //     edit_note(&sqlite_pool, 1, &note, note.id)?;
            // }

            let res = civil_shared::markup_as_struct(&note.content)?;
            num_elements += res.len();
            c += 1;

            if c % 1000 == 0 {
                info!("count: {}", c);
            }
        }
    }
    info!(
        "finished parsing all note markup {}, count: {}",
        num_elements, c
    );

    Ok(())
}

fn convert_syntax_h1(id: Key, content: &str) -> String {
    let mut res: String = String::from("");

    let mut inside: bool = false;
    let mut inside_opening: usize = 0;

    let len = content.len();
    for (i, c) in content.char_indices() {
        let end = cmp::min(len, i + 4);
        if content.chars().take(end).skip(i).collect::<String>() == ":h1 " {
            inside = true;
            inside_opening = i + 4;

            res.push(':');
            res.push('h');
            res.push('1');
            res.push('(');
        }

        if !inside {
            res.push(c);
        } else {
            if i < inside_opening {
                // do nothing
            } else {
                let end = cmp::min(len, i + 1);
                if inside && content.chars().take(end).skip(i).collect::<String>() == "\n" {
                    inside = false;
                    inside_opening = 0;
                    res.push(')');
                    res.push('\n');
                } else {
                    res.push(c);
                }
            }
        }
    }

    if inside {
        res.push(')');
    }

    res
}

fn convert_syntax_h2(id: Key, content: &str) -> String {
    let mut res: String = String::from("");

    let mut inside: bool = false;
    let mut inside_opening: usize = 0;

    let len = content.len();
    for (i, c) in content.chars().enumerate() {
        let end = cmp::min(len, i + 4);
        if content.chars().take(end).skip(i).collect::<String>() == ":h2 " {
            inside = true;
            inside_opening = i + 4;

            res.push(':');
            res.push('h');
            res.push('2');
            res.push('(');
        }

        if !inside {
            res.push(c);
        } else {
            if i < inside_opening {
                // do nothing
            } else {
                let end = cmp::min(len, i + 1);
                if inside && content.chars().take(end).skip(i).collect::<String>() == "\n" {
                    inside = false;
                    inside_opening = 0;
                    res.push(')');
                    res.push('\n');
                } else {
                    res.push(c);
                }
            }
        }
    }

    if inside {
        res.push(')');
    }

    res
}

fn convert_syntax_h3(id: Key, content: &str) -> String {
    let mut res: String = String::from("");

    let mut inside: bool = false;
    let mut inside_opening: usize = 0;

    let len = content.len();
    for (i, c) in content.chars().enumerate() {
        let end = cmp::min(len, i + 4);
        if content.chars().take(end).skip(i).collect::<String>() == ":h3 " {
            inside = true;
            inside_opening = i + 4;

            res.push(':');
            res.push('h');
            res.push('3');
            res.push('(');
        }

        if !inside {
            res.push(c);
        } else {
            if i < inside_opening {
                // do nothing
            } else {
                let end = cmp::min(len, i + 1);
                if inside && content.chars().take(end).skip(i).collect::<String>() == "\n" {
                    inside = false;
                    inside_opening = 0;
                    res.push(')');
                    res.push('\n');
                } else {
                    res.push(c);
                }
            }
        }
    }

    if inside {
        res.push(')');
    }

    res
}

fn convert_syntax_h4(id: Key, content: &str) -> String {
    let mut res: String = String::from("");

    let mut inside: bool = false;
    let mut inside_opening: usize = 0;

    let len = content.len();
    for (i, c) in content.chars().enumerate() {
        let end = cmp::min(len, i + 4);
        if content.chars().take(end).skip(i).collect::<String>() == ":h4 " {
            inside = true;
            inside_opening = i + 4;

            res.push(':');
            res.push('h');
            res.push('4');
            res.push('(');
        }

        if !inside {
            res.push(c);
        } else {
            if i < inside_opening {
                // do nothing
            } else {
                let end = cmp::min(len, i + 1);
                if inside && content.chars().take(end).skip(i).collect::<String>() == "\n" {
                    inside = false;
                    inside_opening = 0;
                    res.push(')');
                    res.push('\n');
                } else {
                    res.push(c);
                }
            }
        }
    }

    if inside {
        res.push(')');
    }

    res
}

fn convert_syntax_h5(id: Key, content: &str) -> String {
    let mut res: String = String::from("");

    let mut inside: bool = false;
    let mut inside_opening: usize = 0;

    let len = content.len();
    for (i, c) in content.chars().enumerate() {
        let end = cmp::min(len, i + 4);
        if content.chars().take(end).skip(i).collect::<String>() == ":h5 " {
            inside = true;
            inside_opening = i + 4;

            res.push(':');
            res.push('h');
            res.push('5');
            res.push('(');
        }

        if !inside {
            res.push(c);
        } else {
            if i < inside_opening {
                // do nothing
            } else {
                let end = cmp::min(len, i + 1);
                if inside && content.chars().take(end).skip(i).collect::<String>() == "\n" {
                    inside = false;
                    inside_opening = 0;
                    res.push(')');
                    res.push('\n');
                } else {
                    res.push(c);
                }
            }
        }
    }

    if inside {
        res.push(')');
    }

    res
}

fn convert_syntax_h6(id: Key, content: &str) -> String {
    let mut res: String = String::from("");

    let mut inside: bool = false;
    let mut inside_opening: usize = 0;

    let len = content.len();
    for (i, c) in content.chars().enumerate() {
        let end = cmp::min(len, i + 4);
        if content.chars().take(end).skip(i).collect::<String>() == ":h6 " {
            inside = true;
            inside_opening = i + 4;

            res.push(':');
            res.push('h');
            res.push('6');
            res.push('(');
        }

        if !inside {
            res.push(c);
        } else {
            if i < inside_opening {
                // do nothing
            } else {
                let end = cmp::min(len, i + 1);
                if inside && content.chars().take(end).skip(i).collect::<String>() == "\n" {
                    inside = false;
                    inside_opening = 0;
                    res.push(')');
                    res.push('\n');
                } else {
                    res.push(c);
                }
            }
        }
    }

    if inside {
        res.push(')');
    }

    res
}

fn convert_syntax_h7(id: Key, content: &str) -> String {
    let mut res: String = String::from("");

    let mut inside: bool = false;
    let mut inside_opening: usize = 0;

    let len = content.len();
    for (i, c) in content.chars().enumerate() {
        let end = cmp::min(len, i + 4);
        if content.chars().take(end).skip(i).collect::<String>() == ":h7 " {
            inside = true;
            inside_opening = i + 4;

            res.push(':');
            res.push('h');
            res.push('7');
            res.push('(');
        }

        if !inside {
            res.push(c);
        } else {
            if i < inside_opening {
                // do nothing
            } else {
                let end = cmp::min(len, i + 1);
                if inside && content.chars().take(end).skip(i).collect::<String>() == "\n" {
                    inside = false;
                    inside_opening = 0;
                    res.push(')');
                    res.push('\n');
                } else {
                    res.push(c);
                }
            }
        }
    }

    if inside {
        res.push(')');
    }

    res
}

fn convert_syntax_h8(id: Key, content: &str) -> String {
    let mut res: String = String::from("");

    let mut inside: bool = false;
    let mut inside_opening: usize = 0;

    let len = content.len();
    for (i, c) in content.chars().enumerate() {
        let end = cmp::min(len, i + 4);
        if content.chars().take(end).skip(i).collect::<String>() == ":h8 " {
            inside = true;
            inside_opening = i + 4;

            res.push(':');
            res.push('h');
            res.push('8');
            res.push('(');
        }

        if !inside {
            res.push(c);
        } else {
            if i < inside_opening {
                // do nothing
            } else {
                let end = cmp::min(len, i + 1);
                if inside && content.chars().take(end).skip(i).collect::<String>() == "\n" {
                    inside = false;
                    inside_opening = 0;
                    res.push(')');
                    res.push('\n');
                } else {
                    res.push(c);
                }
            }
        }
    }

    if inside {
        res.push(')');
    }

    res
}

fn convert_syntax_h9(id: Key, content: &str) -> String {
    let mut res: String = String::from("");

    let mut inside: bool = false;
    let mut inside_opening: usize = 0;

    let len = content.len();
    for (i, c) in content.chars().enumerate() {
        let end = cmp::min(len, i + 4);
        if content.chars().take(end).skip(i).collect::<String>() == ":h9 " {
            inside = true;
            inside_opening = i + 4;

            res.push(':');
            res.push('h');
            res.push('9');
            res.push('(');
        }

        if !inside {
            res.push(c);
        } else {
            if i < inside_opening {
                // do nothing
            } else {
                let end = cmp::min(len, i + 1);
                if inside && content.chars().take(end).skip(i).collect::<String>() == "\n" {
                    inside = false;
                    inside_opening = 0;
                    res.push(')');
                    res.push('\n');
                } else {
                    res.push(c);
                }
            }
        }
    }

    if inside {
        res.push(')');
    }

    res
}

fn convert_syntax_highlight(id: Key, content: &str) -> String {
    let mut res: String = String::from("");
    let mut inside: bool = false;

    // first count to make sure there's an even number of delimiters
    let mut count: i32 = 0;
    for c in content.chars() {
        if c == '^' {
            count += 1;
        }
    }
    if count % 2 != 0 {
        // info!("note id {} has {} delimiters", id, count);
        // info!("{}", content);
        return String::from(content);
    }

    for c in content.chars() {
        if c == '^' {
            inside = !inside;
            if inside {
                res.push(':');
                res.push('h');
                res.push('(');
            } else {
                res.push(')');
            }
        } else {
            res.push(c);
        }
    }

    // if count > 0 {
    //     info!("convert_syntax_highlight ({}): {}", id, &res);
    // }

    res
}

fn convert_syntax_bold(id: Key, content: &str) -> String {
    let mut res: String = String::from("");
    let mut inside: bool = false;

    // first count to make sure there's an even number of delimiters
    let mut count: i32 = 0;
    for c in content.chars() {
        if c == '*' {
            count += 1;
        }
    }
    if count % 2 != 0 {
        // info!("note id {} has {} delimiters", id, count);
        // info!("{}", content);
        return String::from(content);
    }

    for c in content.chars() {
        if c == '*' {
            inside = !inside;
            if inside {
                res.push(':');
                res.push('b');
                res.push('(');
            } else {
                res.push(')');
            }
        } else {
            res.push(c);
        }
    }

    // if count > 0 {
    //     info!("convert_syntax_bold ({}): {}", id, &res);
    // }

    res
}

fn convert_syntax_underline(id: Key, content: &str) -> String {
    // let mut res: String = String::from("");
    // let mut inside: bool = false;

    // first count to make sure there's an even number of delimiters
    let mut count: i32 = 0;
    for c in content.chars() {
        if c == '_' {
            count += 1;
        }
    }
    if count % 2 != 0 {
        // info!("note id {} has {} delimiters", id, count);
        // info!("{}", content);
        return String::from(content);
    }

    // for c in content.chars() {
    //     if c == '_' {
    //         inside = !inside;
    //         if inside {
    //             res.push(':');
    //             res.push('u');
    //             res.push('(');
    //         } else {
    //             res.push(')');
    //         }
    //     } else {
    //         res.push(c);
    //     }
    // }

    if count > 0 {
        info!("convert_syntax_underline ({}) {}", id, content);
    }

    // res
    String::from(content)
}
