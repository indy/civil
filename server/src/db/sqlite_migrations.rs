// Copyright (C) 2022 Inderjit Gill <email@indy.io>

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
use rusqlite::Connection;
use rusqlite_migration::{Migrations, M};

/*

current schema:


CREATE TABLE IF NOT EXISTS users (
       id INTEGER PRIMARY KEY,
       created_at DATETIME DEFAULT CURRENT_TIMESTAMP,

       email TEXT NOT NULL UNIQUE,
       username TEXT NOT NULL,

       image_count INTEGER DEFAULT 0,

       password TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS hits (
       id INTEGER PRIMARY KEY,
       created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
       deck_id INTEGER NOT NULL,
       FOREIGN KEY (deck_id) REFERENCES decks (id) ON DELETE CASCADE ON UPDATE NO ACTION
);

CREATE TABLE IF NOT EXISTS decks (
       id INTEGER PRIMARY KEY,
       created_at DATETIME DEFAULT CURRENT_TIMESTAMP,

       user_id INTEGER NOT NULL,
       kind TEXT NOT NULL, -- 'article', 'person', 'idea', 'timeline', 'quote'

       graph_terminator BOOLEAN DEFAULT FALSE,

       name TEXT NOT NULL,

       FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE ON UPDATE NO ACTION
);

CREATE TABLE IF NOT EXISTS points (
       id INTEGER PRIMARY KEY,
       created_at DATETIME DEFAULT CURRENT_TIMESTAMP,

       deck_id INTEGER NOT NULL,
       title TEXT,
       kind TEXT NOT NULL, -- 'point', 'point_begin', 'point_end'

       location_textual TEXT,
       longitude REAL,
       latitude REAL,
       location_fuzz REAL DEFAULT 0.0,

       date_textual TEXT,
       exact_date DATE,
       lower_date DATE,
       upper_date DATE,
       date_fuzz REAL DEFAULT 1.0,

       FOREIGN KEY (deck_id) REFERENCES decks (id) ON DELETE CASCADE ON UPDATE NO ACTION
);

CREATE TABLE IF NOT EXISTS notes (
       id INTEGER PRIMARY KEY,
       created_at DATETIME DEFAULT CURRENT_TIMESTAMP,

       user_id INTEGER NOT NULL,
       deck_id INTEGER NOT NULL,

       point_id INTEGER,

       kind INTEGER DEFAULT 0, -- 1='note', 2='note_review', 3='note_summary', 4='note_deckmeta'

       content TEXT NOT NULL,

       FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE ON UPDATE NO ACTION,
       FOREIGN KEY (deck_id) REFERENCES decks (id) ON DELETE CASCADE ON UPDATE NO ACTION,
       FOREIGN KEY (point_id) REFERENCES points (id) ON DELETE CASCADE ON UPDATE NO ACTION
);

CREATE TABLE IF NOT EXISTS notes_decks (
       created_at DATETIME DEFAULT CURRENT_TIMESTAMP,

       kind TEXT NOT NULL, -- 'ref', 'ref_to_parent', 'ref_to_child', 'ref_in_contrast', 'ref_critical'
       note_id INTEGER NOT NULL,
       deck_id INTEGER NOT NULL,

       annotation TEXT,

       PRIMARY KEY (note_id, deck_id),
       FOREIGN KEY (note_id) REFERENCES notes (id) ON DELETE CASCADE ON UPDATE NO ACTION,
       FOREIGN KEY (deck_id) REFERENCES decks (id) ON DELETE CASCADE ON UPDATE NO ACTION
);

CREATE TABLE IF NOT EXISTS article_extras (
       deck_id INTEGER NOT NULL,

       source TEXT,
       author TEXT,
       short_description TEXT,

       rating INTEGER DEFAULT 0,
       published_date DATE DEFAULT CURRENT_DATE,

       FOREIGN KEY (deck_id) REFERENCES decks (id) ON DELETE CASCADE ON UPDATE NO ACTION
);

CREATE TABLE IF NOT EXISTS quote_extras (
       deck_id INTEGER NOT NULL,

       attribution TEXT,

       FOREIGN KEY (deck_id) REFERENCES decks (id) ON DELETE CASCADE ON UPDATE NO ACTION
);

CREATE TABLE IF NOT EXISTS images (
       id INTEGER PRIMARY KEY,
       created_at DATETIME DEFAULT CURRENT_TIMESTAMP,

       user_id INTEGER NOT NULL,
       filename TEXT NOT NULL,

       FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE ON UPDATE NO ACTION
);

CREATE TABLE IF NOT EXISTS cards (
       id INTEGER PRIMARY KEY,
       created_at DATETIME DEFAULT CURRENT_TIMESTAMP,

       user_id INTEGER NOT NULL,
       note_id INTEGER NOT NULL,

       prompt TEXT NOT NULL,
       next_test_date DATETIME NOT NULL,

       easiness_factor REAL NOT NULL,
       inter_repetition_interval INTEGER DEFAULT 0,

       FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE ON UPDATE NO ACTION,
       FOREIGN KEY (note_id) REFERENCES notes (id) ON DELETE CASCADE ON UPDATE NO ACTION
);

CREATE TABLE IF NOT EXISTS card_ratings (
       id INTEGER PRIMARY KEY,
       created_at DATETIME DEFAULT CURRENT_TIMESTAMP,

       card_id INTEGER NOT NULL,

       rating INTEGER NOT NULL,

       FOREIGN KEY (card_id) REFERENCES cards (id) ON DELETE CASCADE ON UPDATE NO ACTION
);

CREATE TABLE IF NOT EXISTS stats (
       id INTEGER PRIMARY KEY,
       created_at DATETIME DEFAULT CURRENT_TIMESTAMP,

       user_id INTEGER NOT NULL,

       num_ideas INTEGER DEFAULT 0,
       num_articles INTEGER DEFAULT 0,
       num_people INTEGER DEFAULT 0,
       num_timelines INTEGER DEFAULT 0,
       num_quotes INTEGER DEFAULT 0,

       num_refs INTEGER DEFAULT 0,
       num_cards INTEGER DEFAULT 0,
       num_card_ratings INTEGER DEFAULT 0,
       num_images INTEGER DEFAULT 0,

       num_notes_in_ideas INTEGER DEFAULT 0,
       num_notes_in_articles INTEGER DEFAULT 0,
       num_notes_in_people INTEGER DEFAULT 0,
       num_notes_in_timelines INTEGER DEFAULT 0,
       num_notes_in_quotes INTEGER DEFAULT 0,

       num_points_in_people INTEGER DEFAULT 0,
       num_points_in_timelines INTEGER DEFAULT 0,

       num_refs_ideas_to_ideas INTEGER DEFAULT 0,
       num_refs_ideas_to_articles INTEGER DEFAULT 0,
       num_refs_ideas_to_people INTEGER DEFAULT 0,
       num_refs_ideas_to_timelines INTEGER DEFAULT 0,
       num_refs_ideas_to_quotes INTEGER DEFAULT 0,

       num_refs_articles_to_ideas INTEGER DEFAULT 0,
       num_refs_articles_to_articles INTEGER DEFAULT 0,
       num_refs_articles_to_people INTEGER DEFAULT 0,
       num_refs_articles_to_timelines INTEGER DEFAULT 0,
       num_refs_articles_to_quotes INTEGER DEFAULT 0,

       num_refs_people_to_ideas INTEGER DEFAULT 0,
       num_refs_people_to_articles INTEGER DEFAULT 0,
       num_refs_people_to_people INTEGER DEFAULT 0,
       num_refs_people_to_timelines INTEGER DEFAULT 0,
       num_refs_people_to_quotes INTEGER DEFAULT 0,

       num_refs_timelines_to_ideas INTEGER DEFAULT 0,
       num_refs_timelines_to_articles INTEGER DEFAULT 0,
       num_refs_timelines_to_people INTEGER DEFAULT 0,
       num_refs_timelines_to_timelines INTEGER DEFAULT 0,
       num_refs_timelines_to_quotes INTEGER DEFAULT 0,

       num_refs_quotes_to_ideas INTEGER DEFAULT 0,
       num_refs_quotes_to_articles INTEGER DEFAULT 0,
       num_refs_quotes_to_people INTEGER DEFAULT 0,
       num_refs_quotes_to_timelines INTEGER DEFAULT 0,
       num_refs_quotes_to_quotes INTEGER DEFAULT 0,

       FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE ON UPDATE NO ACTION
);
 */

pub fn migration_check(db_name: &str) -> Result<()> {
    // Define migrations
    let migrations = Migrations::new(vec![

        ////////////////
        // MIGRATION 0
        ////////////////
        M::up("CREATE TABLE IF NOT EXISTS users (
                   id INTEGER PRIMARY KEY,
                   created_at DATETIME DEFAULT CURRENT_TIMESTAMP,

                   email TEXT NOT NULL UNIQUE,
                   username TEXT NOT NULL,

                   image_count INTEGER DEFAULT 0,

                   password TEXT NOT NULL
               );

               CREATE TABLE IF NOT EXISTS decks (
                   id INTEGER PRIMARY KEY,
                   created_at DATETIME DEFAULT CURRENT_TIMESTAMP,

                   user_id INTEGER NOT NULL,
                   kind TEXT NOT NULL, -- 'article', 'person', 'idea', 'timeline', 'quote'

                   graph_terminator BOOLEAN DEFAULT FALSE,

                   name TEXT NOT NULL,

                   FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE ON UPDATE NO ACTION
               );

               CREATE TABLE IF NOT EXISTS points (
                   id INTEGER PRIMARY KEY,
                   created_at DATETIME DEFAULT CURRENT_TIMESTAMP,

                   deck_id INTEGER NOT NULL,
                   title TEXT,
                   kind TEXT NOT NULL, -- 'point', 'point_begin', 'point_end'

                   location_textual TEXT,
                   longitude REAL,
                   latitude REAL,
                   location_fuzz REAL DEFAULT 0.0,

                   date_textual TEXT,
                   exact_date DATE,
                   lower_date DATE,
                   upper_date DATE,
                   date_fuzz REAL DEFAULT 1.0,

                   FOREIGN KEY (deck_id) REFERENCES decks (id) ON DELETE CASCADE ON UPDATE NO ACTION
               );

               CREATE TABLE IF NOT EXISTS notes (
                   id INTEGER PRIMARY KEY,
                   created_at DATETIME DEFAULT CURRENT_TIMESTAMP,

                   user_id INTEGER NOT NULL,
                   deck_id INTEGER NOT NULL,

                   point_id INTEGER,

                   kind TEXT NOT NULL, -- 'note', 'note_review', 'note_summary'

                   content TEXT NOT NULL,

                   FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE ON UPDATE NO ACTION,
                   FOREIGN KEY (deck_id) REFERENCES decks (id) ON DELETE CASCADE ON UPDATE NO ACTION,
                   FOREIGN KEY (point_id) REFERENCES points (id) ON DELETE CASCADE ON UPDATE NO ACTION
               );

               CREATE TABLE IF NOT EXISTS notes_decks (
                   created_at DATETIME DEFAULT CURRENT_TIMESTAMP,

                   kind TEXT NOT NULL, -- 'ref', 'ref_to_parent', 'ref_to_child', 'ref_in_contrast', 'ref_critical'
                   note_id INTEGER NOT NULL,
                   deck_id INTEGER NOT NULL,

                   annotation TEXT,

                   PRIMARY KEY (note_id, deck_id),
                   FOREIGN KEY (note_id) REFERENCES notes (id) ON DELETE CASCADE ON UPDATE NO ACTION,
                   FOREIGN KEY (deck_id) REFERENCES decks (id) ON DELETE CASCADE ON UPDATE NO ACTION
               );

               CREATE TABLE IF NOT EXISTS article_extras (
                   deck_id INTEGER NOT NULL,

                   source TEXT,
                   author TEXT,
                   short_description TEXT,

                   rating INTEGER DEFAULT 0,
                    published_date DATE DEFAULT CURRENT_DATE,

                   FOREIGN KEY (deck_id) REFERENCES decks (id) ON DELETE CASCADE ON UPDATE NO ACTION
               );

               CREATE TABLE IF NOT EXISTS quote_extras (
                   deck_id INTEGER NOT NULL,

                   attribution TEXT,

                   FOREIGN KEY (deck_id) REFERENCES decks (id) ON DELETE CASCADE ON UPDATE NO ACTION
               );

               CREATE TABLE IF NOT EXISTS images (
                   id INTEGER PRIMARY KEY,
                   created_at DATETIME DEFAULT CURRENT_TIMESTAMP,

                   user_id INTEGER NOT NULL,
                   filename TEXT NOT NULL,

                   FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE ON UPDATE NO ACTION
               );

               CREATE TABLE IF NOT EXISTS cards (
                   id INTEGER PRIMARY KEY,
                   created_at DATETIME DEFAULT CURRENT_TIMESTAMP,

                   user_id INTEGER NOT NULL,
                   note_id INTEGER NOT NULL,

                   prompt TEXT NOT NULL,
                   next_test_date DATETIME NOT NULL,

                   easiness_factor REAL NOT NULL,
                   inter_repetition_interval INTEGER DEFAULT 0,

                   FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE ON UPDATE NO ACTION,
                   FOREIGN KEY (note_id) REFERENCES notes (id) ON DELETE CASCADE ON UPDATE NO ACTION
               );

               CREATE TABLE IF NOT EXISTS card_ratings (
                   id INTEGER PRIMARY KEY,
                   created_at DATETIME DEFAULT CURRENT_TIMESTAMP,

                   card_id INTEGER NOT NULL,

                   rating INTEGER NOT NULL,

                   FOREIGN KEY (card_id) REFERENCES cards (id) ON DELETE CASCADE ON UPDATE NO ACTION
               );

               CREATE TABLE IF NOT EXISTS stats (
                   id INTEGER PRIMARY KEY,
                   created_at DATETIME DEFAULT CURRENT_TIMESTAMP,

                   user_id INTEGER NOT NULL,

                   num_ideas INTEGER DEFAULT 0,
                   num_articles INTEGER DEFAULT 0,
                   num_people INTEGER DEFAULT 0,
                   num_timelines INTEGER DEFAULT 0,
                   num_quotes INTEGER DEFAULT 0,

                   num_refs INTEGER DEFAULT 0,
                   num_cards INTEGER DEFAULT 0,
                   num_card_ratings INTEGER DEFAULT 0,
                   num_images INTEGER DEFAULT 0,

                   num_notes_in_ideas INTEGER DEFAULT 0,
                   num_notes_in_articles INTEGER DEFAULT 0,
                   num_notes_in_people INTEGER DEFAULT 0,
                   num_notes_in_timelines INTEGER DEFAULT 0,
                   num_notes_in_quotes INTEGER DEFAULT 0,

                   num_points_in_people INTEGER DEFAULT 0,
                   num_points_in_timelines INTEGER DEFAULT 0,

                   num_refs_ideas_to_ideas INTEGER DEFAULT 0,
                   num_refs_ideas_to_articles INTEGER DEFAULT 0,
                   num_refs_ideas_to_people INTEGER DEFAULT 0,
                   num_refs_ideas_to_timelines INTEGER DEFAULT 0,
                   num_refs_ideas_to_quotes INTEGER DEFAULT 0,

                   num_refs_articles_to_ideas INTEGER DEFAULT 0,
                   num_refs_articles_to_articles INTEGER DEFAULT 0,
                   num_refs_articles_to_people INTEGER DEFAULT 0,
                   num_refs_articles_to_timelines INTEGER DEFAULT 0,
                   num_refs_articles_to_quotes INTEGER DEFAULT 0,

                   num_refs_people_to_ideas INTEGER DEFAULT 0,
                   num_refs_people_to_articles INTEGER DEFAULT 0,
                   num_refs_people_to_people INTEGER DEFAULT 0,
                   num_refs_people_to_timelines INTEGER DEFAULT 0,
                   num_refs_people_to_quotes INTEGER DEFAULT 0,

                   num_refs_timelines_to_ideas INTEGER DEFAULT 0,
                   num_refs_timelines_to_articles INTEGER DEFAULT 0,
                   num_refs_timelines_to_people INTEGER DEFAULT 0,
                   num_refs_timelines_to_timelines INTEGER DEFAULT 0,
                   num_refs_timelines_to_quotes INTEGER DEFAULT 0,

                   num_refs_quotes_to_ideas INTEGER DEFAULT 0,
                   num_refs_quotes_to_articles INTEGER DEFAULT 0,
                   num_refs_quotes_to_people INTEGER DEFAULT 0,
                   num_refs_quotes_to_timelines INTEGER DEFAULT 0,
                   num_refs_quotes_to_quotes INTEGER DEFAULT 0,

                   FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE ON UPDATE NO ACTION
               );",
        ),

        ////////////////
        // MIGRATION 1: Enabling full text search
        ////////////////
        M::up("CREATE VIRTUAL TABLE decks_fts USING fts5(name, content='decks', content_rowid='id');
               CREATE TRIGGER decks_fts_ai AFTER INSERT ON decks BEGIN
                   INSERT INTO decks_fts(rowid, name) VALUES (new.id, new.name);
               END;
               CREATE TRIGGER decks_fts_ad AFTER DELETE ON decks BEGIN
                   INSERT INTO decks_fts(decks_fts, rowid, name) VALUES('delete', old.id, old.name);
               END;
               CREATE TRIGGER decks_fts_au AFTER UPDATE ON decks BEGIN
                   INSERT INTO decks_fts(decks_fts, rowid, name) VALUES('delete', old.id, old.name);
                   INSERT INTO decks_fts(rowid, name) VALUES (new.id, new.name);
               END;

               CREATE VIRTUAL TABLE points_fts USING fts5(title, location_textual, date_textual, content='points', content_rowid='id');
               CREATE TRIGGER points_fts_ai AFTER INSERT ON points BEGIN
                   INSERT INTO points_fts(rowid, title, location_textual, date_textual) VALUES (new.id, new.title, new.location_textual, new.date_textual);
               END;
               CREATE TRIGGER points_fts_ad AFTER DELETE ON points BEGIN
                   INSERT INTO points_fts(points_fts, rowid, title, location_textual, date_textual) VALUES('delete', old.id, old.title, old.location_textual, old.date_textual);
               END;
               CREATE TRIGGER points_fts_au AFTER UPDATE ON points BEGIN
                   INSERT INTO points_fts(points_fts, rowid, title, location_textual, date_textual) VALUES('delete', old.id, old.title, old.location_textual, old.date_textual);
                   INSERT INTO points_fts(rowid, title, location_textual, date_textual) VALUES (new.id, new.title, new.location_textual, new.date_textual);
               END;

               CREATE VIRTUAL TABLE notes_fts USING fts5(content, content='notes', content_rowid='id');
               CREATE TRIGGER notes_fts_ai AFTER INSERT ON notes BEGIN
                   INSERT INTO notes_fts(rowid, content) VALUES (new.id, new.content);
               END;
               CREATE TRIGGER notes_fts_ad AFTER DELETE ON notes BEGIN
                   INSERT INTO notes_fts(notes_fts, rowid, content) VALUES('delete', old.id, old.content);
               END;
               CREATE TRIGGER notes_fts_au AFTER UPDATE ON notes BEGIN
                   INSERT INTO notes_fts(notes_fts, rowid, content) VALUES('delete', old.id, old.content);
                   INSERT INTO notes_fts(rowid, content) VALUES (new.id, new.content);
               END;

               CREATE VIRTUAL TABLE article_extras_fts USING fts5(source, author, short_description, content='article_extras', content_rowid='deck_id');
               CREATE TRIGGER article_extras_fts_ai AFTER INSERT ON article_extras BEGIN
                   INSERT INTO article_extras_fts(rowid, source, author, short_description) VALUES (new.deck_id, new.source, new.author, new.short_description);
               END;
               CREATE TRIGGER article_extras_fts_ad AFTER DELETE ON article_extras BEGIN
                   INSERT INTO article_extras_fts(article_extras_fts, rowid, source, author, short_description) VALUES('delete', old.deck_id, old.source, old.author, old.short_description);
               END;
               CREATE TRIGGER article_extras_fts_au AFTER UPDATE ON article_extras BEGIN
                   INSERT INTO article_extras_fts(article_extras_fts, rowid, source, author, short_description) VALUES('delete', old.deck_id, old.source, old.author, old.short_description);
                   INSERT INTO article_extras_fts(rowid, source, author, short_description) VALUES (new.deck_id, new.source, new.author, new.short_description);
               END;

               CREATE VIRTUAL TABLE quote_extras_fts USING fts5(attribution, content='quote_extras', content_rowid='deck_id');
               CREATE TRIGGER quote_extras_fts_ai AFTER INSERT ON quote_extras BEGIN
                   INSERT INTO quote_extras_fts(rowid, attribution) VALUES (new.deck_id, new.attribution);
               END;
               CREATE TRIGGER quote_extras_fts_ad AFTER DELETE ON quote_extras BEGIN
                   INSERT INTO quote_extras_fts(quote_extras_fts, rowid, attribution) VALUES('delete', old.deck_id, old.attribution);
               END;
               CREATE TRIGGER quote_extras_fts_au AFTER UPDATE ON quote_extras BEGIN
                   INSERT INTO quote_extras_fts(quote_extras_fts, rowid, attribution) VALUES('delete', old.deck_id, old.attribution);
                   INSERT INTO quote_extras_fts(rowid, attribution) VALUES (new.deck_id, new.attribution);
               END;"),

        ////////////////
        // MIGRATION 2: Add hits table
        ////////////////
        M::up("CREATE TABLE IF NOT EXISTS hits (
                   id INTEGER PRIMARY KEY,
                   created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                   deck_id INTEGER NOT NULL,
                   FOREIGN KEY (deck_id) REFERENCES decks (id) ON DELETE CASCADE ON UPDATE NO ACTION
               );"),

        ////////////////
        // MIGRATION 3: notes::kind converted from text to integer
        ////////////////
        M::up("ALTER TABLE notes RENAME COLUMN kind TO kind_old;
               ALTER TABLE notes ADD COLUMN kind INTEGER DEFAULT 0;

               UPDATE notes SET kind = 1 WHERE kind_old = 'note';
               UPDATE notes SET kind = 2 WHERE kind_old = 'note_review';
               UPDATE notes SET kind = 3 WHERE kind_old = 'note_summary';

               ALTER TABLE notes DROP COLUMN kind_old;"),
    ]);

    let mut conn = Connection::open(db_name)?;

    // Apply some PRAGMA, often better to do it outside of migrations
    conn.pragma_update(None, "journal_mode", &"WAL")?;

    // Update the database schema, atomically
    migrations.to_latest(&mut conn)?;

    Ok(())
}
