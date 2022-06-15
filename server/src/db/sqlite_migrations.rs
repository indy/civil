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

pub fn migration_check(db_name: &str) -> Result<()> {
    // Define migrations
    let migrations = Migrations::new(vec![M::up(
        r#"
CREATE TABLE IF NOT EXISTS users (
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
);
"#,
    ),
                                          M::up(r#"
CREATE VIRTUAL TABLE decks_fts USING fts5(name, content='decks', content_rowid='id');
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
END;

"#)]);

    let mut conn = Connection::open(db_name)?;

    // Apply some PRAGMA, often better to do it outside of migrations
    conn.pragma_update(None, "journal_mode", &"WAL")?;

    // Update the database schema, atomically
    migrations.to_latest(&mut conn)?;

    Ok(())
}


use crate::db::ref_kind::RefKind;
use crate::db::deck_kind::DeckKind;
use crate::db::point_kind::PointKind;
use crate::db::note_kind::NoteKind;
use rusqlite::params;
use crate::db::sqlite::{self, SqlitePool};
use crate::db::pg;
use crate::interop::Key;
use chrono::{Datelike, Timelike};
use serde::{Deserialize, Serialize};
use tokio_pg_mapper_derive::PostgresMapper; // need this so that year(), month(), etc can work
use tracing::info;


#[allow(dead_code)]
pub async fn migrate_from_postgres(
    sqlite_pool: SqlitePool,
    postgres_pool: deadpool_postgres::Pool,
) -> Result<()> {
    migrate_users(&sqlite_pool, &postgres_pool).await?;
    migrate_decks(&sqlite_pool, &postgres_pool).await?;
    migrate_points(&sqlite_pool, &postgres_pool).await?;
    migrate_notes(&sqlite_pool, &postgres_pool).await?;
    migrate_notes_decks(&sqlite_pool, &postgres_pool).await?;
    migrate_article_extras(&sqlite_pool, &postgres_pool).await?;
    migrate_quote_extras(&sqlite_pool, &postgres_pool).await?;
    migrate_images(&sqlite_pool, &postgres_pool).await?;
    migrate_cards(&sqlite_pool, &postgres_pool).await?;
    migrate_card_ratings(&sqlite_pool, &postgres_pool).await?;
    migrate_stats(&sqlite_pool, &postgres_pool).await?;
    Ok(())
}

#[allow(dead_code)]
async fn migrate_users(sqlite_pool: &SqlitePool, postgres_pool: &deadpool_postgres::Pool) -> Result<()> {
    info!("migrating users");

    #[derive(Deserialize, PostgresMapper, Serialize)]
    #[pg_mapper(table = "users")]
    struct User {
        id: Key,
        created_at: chrono::DateTime<chrono::Utc>,
        email: String,
        username: String,
        image_count: i32,
        password: String,
    }

    let all_users = pg::many_non_transactional::<User>(
        postgres_pool,
        "SELECT $table_fields
         FROM users",
        &[],
    )
    .await?;

    let conn = sqlite_pool.get()?;
    for user in all_users {
        sqlite::zero(
            &conn,
            r#"
               insert into users (id, created_at, email, username, image_count, password)
               values(?1, ?2, ?3, ?4, ?5, ?6)
            "#,
            params![
                user.id,
                as_naive_datetime(user.created_at),
                user.email,
                user.username,
                user.image_count,
                user.password
            ],
        )?;
    }

    Ok(())
}

#[allow(dead_code)]
async fn migrate_decks(sqlite_pool: &SqlitePool, postgres_pool: &deadpool_postgres::Pool) -> Result<()> {
    info!("migrating decks");

    #[derive(Deserialize, PostgresMapper, Serialize)]
    #[pg_mapper(table = "decks")]
    struct Deck {
        id: Key,
        created_at: chrono::DateTime<chrono::Utc>,
        user_id: Key,
        kind: DeckKind,
        graph_terminator: bool,
        name: String,
    }

    let all_decks = pg::many_non_transactional::<Deck>(
        postgres_pool,
        "SELECT $table_fields
         FROM decks",
        &[],
    )
    .await?;

    let conn = sqlite_pool.get()?;
    for deck in all_decks {
        let kind = match deck.kind {
            DeckKind::Article => "article",
            DeckKind::Person => "person",
            DeckKind::Idea => "idea",
            DeckKind::Timeline => "timeline",
            DeckKind::Quote => "quote"
        };

        sqlite::zero(
            &conn,
            r#"
               insert into decks (id, created_at, user_id, kind, graph_terminator, name)
               values(?1, ?2, ?3, ?4, ?5, ?6)
            "#,
            params![
                deck.id,
                as_naive_datetime(deck.created_at),
                deck.user_id,
                kind,
                deck.graph_terminator,
                deck.name
            ],
        )?;
    }

    Ok(())
}

#[allow(dead_code)]
async fn migrate_points(sqlite_pool: &SqlitePool, postgres_pool: &deadpool_postgres::Pool) -> Result<()> {
    info!("migrating points");

    #[derive(Deserialize, PostgresMapper, Serialize)]
    #[pg_mapper(table = "points")]
    struct Point {
        id: Key,
        created_at: chrono::DateTime<chrono::Utc>,
        deck_id: Key,
        title: Option<String>,
        kind: PointKind,

        location_textual: Option<String>,
        longitude: Option<f32>,
        latitude: Option<f32>,
        location_fuzz: f32,

        date_textual: Option<String>,
        exact_date: Option<chrono::NaiveDate>,
        lower_date: Option<chrono::NaiveDate>,
        upper_date: Option<chrono::NaiveDate>,
        date_fuzz: f32,
    }

    let all_points = pg::many_non_transactional::<Point>(
        postgres_pool,
        "SELECT $table_fields
         FROM points",
        &[],
    )
    .await?;

    let conn = sqlite_pool.get()?;
    for point in all_points {
        let kind = match point.kind {
            PointKind::Point => "point",
            PointKind::PointBegin => "point_begin",
            PointKind::PointEnd => "point_end",
        };

        sqlite::zero(
            &conn,
            r#"
               insert into points (id, created_at, deck_id, title, kind, location_textual, longitude, latitude, location_fuzz, date_textual, exact_date, lower_date, upper_date, date_fuzz)
               values(?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14)
            "#,
            params![
                point.id,
                as_naive_datetime(point.created_at),
                point.deck_id,
                point.title,
                kind,
                point.location_textual,
                point.longitude,
                point.latitude,
                point.location_fuzz,
                point.date_textual,
                point.exact_date,
                point.lower_date,
                point.upper_date,
                point.date_fuzz
            ],
        )?;
    }

    Ok(())
}

#[allow(dead_code)]
async fn migrate_notes(sqlite_pool: &SqlitePool, postgres_pool: &deadpool_postgres::Pool) -> Result<()> {
    info!("migrating notes");

    #[derive(Deserialize, PostgresMapper, Serialize)]
    #[pg_mapper(table = "notes")]
    struct Note {
        id: Key,
        created_at: chrono::DateTime<chrono::Utc>,
        user_id: Key,
        deck_id: Key,
        point_id: Option<Key>,
        kind: NoteKind,
        content: String,
    }

    let all_notes = pg::many_non_transactional::<Note>(
        postgres_pool,
        "SELECT $table_fields
         FROM notes",
        &[],
    )
    .await?;

    let conn = sqlite_pool.get()?;
    for note in all_notes {
        let kind = match note.kind {
            NoteKind::Note => "note",
            NoteKind::NoteReview => "note_review",
            NoteKind::NoteSummary => "note_summary",
        };

        sqlite::zero(
            &conn,
            r#"
               insert into notes (id, created_at, user_id, deck_id, point_id, kind, content)
               values(?1, ?2, ?3, ?4, ?5, ?6, ?7)
            "#,
            params![
                note.id,
                as_naive_datetime(note.created_at),
                note.user_id,
                note.deck_id,
                note.point_id,
                kind,
                note.content
            ],
        )?;
    }

    Ok(())
}

#[allow(dead_code)]
async fn migrate_notes_decks(sqlite_pool: &SqlitePool, postgres_pool: &deadpool_postgres::Pool) -> Result<()> {
    info!("migrating notes_decks");

    #[derive(Deserialize, PostgresMapper, Serialize)]
    #[pg_mapper(table = "notes_decks")]
    struct NoteDeck {
        created_at: chrono::DateTime<chrono::Utc>,
        kind: RefKind,
        note_id: Key,
        deck_id: Key,
        annotation: Option<String>,
    }

    let all_notedecks = pg::many_non_transactional::<NoteDeck>(
        postgres_pool,
        "SELECT $table_fields
         FROM notes_decks",
        &[],
    )
    .await?;

    let conn = sqlite_pool.get()?;
    for notedeck in all_notedecks {
        let kind = match notedeck.kind {
            RefKind::Ref => "ref",
            RefKind::RefToParent => "ref_to_parent",
            RefKind::RefToChild => "ref_to_child",
            RefKind::RefInContrast => "ref_in_contrast",
            RefKind::RefCritical => "ref_critical",
        };

        sqlite::zero(
            &conn,
            r#"
               insert into notes_decks (created_at, kind, note_id, deck_id, annotation)
               values(?1, ?2, ?3, ?4, ?5)
            "#,
            params![
                as_naive_datetime(notedeck.created_at),
                kind,
                notedeck.note_id,
                notedeck.deck_id,
                notedeck.annotation
            ],
        )?;
    }

    Ok(())
}
#[allow(dead_code)]
async fn migrate_article_extras(sqlite_pool: &SqlitePool, postgres_pool: &deadpool_postgres::Pool) -> Result<()> {
    info!("migrating article_extras");

    #[derive(Deserialize, PostgresMapper, Serialize)]
    #[pg_mapper(table = "article_extras")]
    struct ArticleExtra {
        deck_id: Key,

        source: Option<String>,
        author: Option<String>,
        short_description: Option<String>,

        rating: i32,

        published_date: chrono::NaiveDate,
    }

    let all_article_extras = pg::many_non_transactional::<ArticleExtra>(
        postgres_pool,
        "SELECT $table_fields
         FROM article_extras",
        &[],
    )
    .await?;

    let conn = sqlite_pool.get()?;
    for ae in all_article_extras {
        sqlite::zero(
            &conn,
            r#"
               insert into article_extras (deck_id, source, author, short_description, rating, published_date)
               values(?1, ?2, ?3, ?4, ?5, ?6)
            "#,
            params![
                ae.deck_id,
                ae.source,
                ae.author,
                ae.short_description,
                ae.rating,
                ae.published_date,
            ],
        )?;
    }

    Ok(())
}
#[allow(dead_code)]
async fn migrate_quote_extras(sqlite_pool: &SqlitePool, postgres_pool: &deadpool_postgres::Pool) -> Result<()> {
    info!("migrating quote_extras");

    #[derive(Deserialize, PostgresMapper, Serialize)]
    #[pg_mapper(table = "quote_extras")]
    struct QuoteExtra {
        deck_id: Key,
        attribution: Option<String>,
    }

    let all_quote_extras = pg::many_non_transactional::<QuoteExtra>(
        postgres_pool,
        "SELECT $table_fields
         FROM quote_extras",
        &[],
    )
    .await?;

    let conn = sqlite_pool.get()?;
    for qe in all_quote_extras {
        sqlite::zero(
            &conn,
            r#"
               insert into quote_extras (deck_id, attribution)
               values(?1, ?2)
            "#,
            params![
                qe.deck_id,
                qe.attribution,
            ],
        )?;
    }

    Ok(())
}
#[allow(dead_code)]
async fn migrate_images(sqlite_pool: &SqlitePool, postgres_pool: &deadpool_postgres::Pool) -> Result<()> {
    info!("migrating images");

    #[derive(Deserialize, PostgresMapper, Serialize)]
    #[pg_mapper(table = "images")]
    struct Image {
        id: Key,
        created_at: chrono::DateTime<chrono::Utc>,
        user_id: Key,
        filename: String,
    }

    let all_images = pg::many_non_transactional::<Image>(
        postgres_pool,
        "SELECT $table_fields
         FROM images",
        &[],
    )
    .await?;

    let conn = sqlite_pool.get()?;
    for i in all_images {
        sqlite::zero(
            &conn,
            r#"
               insert into images (id, created_at, user_id, filename)
               values(?1, ?2, ?3, ?4)
            "#,
            params![
                i.id,
                as_naive_datetime(i.created_at),
                i.user_id,
                i.filename,
            ],
        )?;
    }

    Ok(())
}
#[allow(dead_code)]
async fn migrate_cards(sqlite_pool: &SqlitePool, postgres_pool: &deadpool_postgres::Pool) -> Result<()> {
    info!("migrating cards");

    #[derive(Deserialize, PostgresMapper, Serialize)]
    #[pg_mapper(table = "cards")]
    struct Card {
        id: Key,
        created_at: chrono::DateTime<chrono::Utc>,
        user_id: Key,
        note_id: Key,
        prompt: String,
        next_test_date: chrono::DateTime<chrono::Utc>,
        easiness_factor: f32,
        inter_repetition_interval: i32,
    }

    let all_cards = pg::many_non_transactional::<Card>(
        postgres_pool,
        "SELECT $table_fields
         FROM cards",
        &[],
    )
    .await?;

    let conn = sqlite_pool.get()?;
    for card in all_cards {
        sqlite::zero(
            &conn,
            r#"
               insert into cards (id, created_at, user_id, note_id, prompt, next_test_date, easiness_factor, inter_repetition_interval)
               values(?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)
            "#,
            params![
                card.id,
                as_naive_datetime(card.created_at),
                card.user_id,
                card.note_id,
                card.prompt,
                as_naive_datetime(card.next_test_date),
                card.easiness_factor,
                card.inter_repetition_interval,
            ],
        )?;
    }

    Ok(())
}
#[allow(dead_code)]
async fn migrate_card_ratings(sqlite_pool: &SqlitePool, postgres_pool: &deadpool_postgres::Pool) -> Result<()> {
    info!("migrating card_ratings");

    #[derive(Deserialize, PostgresMapper, Serialize)]
    #[pg_mapper(table = "card_ratings")]
    struct CardRating {
        id: Key,
        created_at: chrono::DateTime<chrono::Utc>,
        card_id: Key,
        rating: i16,
    }

    let all_card_ratings = pg::many_non_transactional::<CardRating>(
        postgres_pool,
        "SELECT $table_fields
         FROM card_ratings",
        &[],
    )
    .await?;

    let conn = sqlite_pool.get()?;
    for card_rating in all_card_ratings {
        sqlite::zero(
            &conn,
            r#"
               insert into card_ratings (id, created_at, card_id, rating)
               values(?1, ?2, ?3, ?4)
            "#,
            params![
                card_rating.id,
                as_naive_datetime(card_rating.created_at),
                card_rating.card_id,
                card_rating.rating,
            ],
        )?;
    }

    Ok(())
}
#[allow(dead_code)]
async fn migrate_stats(sqlite_pool: &SqlitePool, postgres_pool: &deadpool_postgres::Pool) -> Result<()> {
    info!("migrating stats");

    #[derive(Deserialize, PostgresMapper, Serialize)]
    #[pg_mapper(table = "stats")]
    struct Stat {
        id: Key,
        created_at: chrono::DateTime<chrono::Utc>,

        user_id: Key,

        num_ideas: i32,
        num_articles: i32,
        num_people: i32,
        num_timelines: i32,
        num_quotes: i32,

        num_refs: i32,
        num_cards: i32,
        num_card_ratings: i32,
        num_images: i32,

        num_notes_in_ideas: i32,
        num_notes_in_articles: i32,
        num_notes_in_people: i32,
        num_notes_in_timelines: i32,
        num_notes_in_quotes: i32,

        num_points_in_people: i32,
        num_points_in_timelines: i32,

        num_refs_ideas_to_ideas: i32,
        num_refs_ideas_to_articles: i32,
        num_refs_ideas_to_people: i32,
        num_refs_ideas_to_timelines: i32,
        num_refs_ideas_to_quotes: i32,

        num_refs_articles_to_ideas: i32,
        num_refs_articles_to_articles: i32,
        num_refs_articles_to_people: i32,
        num_refs_articles_to_timelines: i32,
        num_refs_articles_to_quotes: i32,

        num_refs_people_to_ideas: i32,
        num_refs_people_to_articles: i32,
        num_refs_people_to_people: i32,
        num_refs_people_to_timelines: i32,
        num_refs_people_to_quotes: i32,

        num_refs_timelines_to_ideas: i32,
        num_refs_timelines_to_articles: i32,
        num_refs_timelines_to_people: i32,
        num_refs_timelines_to_timelines: i32,
        num_refs_timelines_to_quotes: i32,

        num_refs_quotes_to_ideas: i32,
        num_refs_quotes_to_articles: i32,
        num_refs_quotes_to_people: i32,
        num_refs_quotes_to_timelines: i32,
        num_refs_quotes_to_quotes: i32,
    }

    let all_stats = pg::many_non_transactional::<Stat>(
        postgres_pool,
        "SELECT $table_fields
         FROM stats",
        &[],
    )
    .await?;

    let conn = sqlite_pool.get()?;
    for stat in all_stats {
        sqlite::zero(
            &conn,
            r#"
               insert into stats (id, created_at, user_id, num_ideas, num_articles, num_people, num_timelines, num_quotes, num_refs, num_cards, num_card_ratings, num_images, num_notes_in_ideas, num_notes_in_articles, num_notes_in_people, num_notes_in_timelines, num_notes_in_quotes, num_points_in_people, num_points_in_timelines, num_refs_ideas_to_ideas, num_refs_ideas_to_articles, num_refs_ideas_to_people, num_refs_ideas_to_timelines, num_refs_ideas_to_quotes, num_refs_articles_to_ideas, num_refs_articles_to_articles, num_refs_articles_to_people, num_refs_articles_to_timelines, num_refs_articles_to_quotes, num_refs_people_to_ideas, num_refs_people_to_articles, num_refs_people_to_people, num_refs_people_to_timelines, num_refs_people_to_quotes, num_refs_timelines_to_ideas, num_refs_timelines_to_articles, num_refs_timelines_to_people, num_refs_timelines_to_timelines, num_refs_timelines_to_quotes, num_refs_quotes_to_ideas, num_refs_quotes_to_articles, num_refs_quotes_to_people, num_refs_quotes_to_timelines, num_refs_quotes_to_quotes)
               values(?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14, ?15, ?16, ?17, ?18, ?19, ?20, ?21, ?22, ?23, ?24, ?25, ?26, ?27, ?28, ?29, ?30, ?31, ?32, ?33, ?34, ?35, ?36, ?37, ?38, ?39, ?40, ?41, ?42, ?43, ?44)
            "#,
            params![
                stat.id,
                as_naive_datetime(stat.created_at),
                stat.user_id,


                stat.num_ideas,
                stat.num_articles,
                stat.num_people,
                stat.num_timelines,
                stat.num_quotes,

                stat.num_refs,
                stat.num_cards,
                stat.num_card_ratings,
                stat.num_images,

                stat.num_notes_in_ideas,
                stat.num_notes_in_articles,
                stat.num_notes_in_people,
                stat.num_notes_in_timelines,
                stat.num_notes_in_quotes,

                stat.num_points_in_people,
                stat.num_points_in_timelines,

                stat.num_refs_ideas_to_ideas,
                stat.num_refs_ideas_to_articles,
                stat.num_refs_ideas_to_people,
                stat.num_refs_ideas_to_timelines,
                stat.num_refs_ideas_to_quotes,

                stat.num_refs_articles_to_ideas,
                stat.num_refs_articles_to_articles,
                stat.num_refs_articles_to_people,
                stat.num_refs_articles_to_timelines,
                stat.num_refs_articles_to_quotes,

                stat.num_refs_people_to_ideas,
                stat.num_refs_people_to_articles,
                stat.num_refs_people_to_people,
                stat.num_refs_people_to_timelines,
                stat.num_refs_people_to_quotes,

                stat.num_refs_timelines_to_ideas,
                stat.num_refs_timelines_to_articles,
                stat.num_refs_timelines_to_people,
                stat.num_refs_timelines_to_timelines,
                stat.num_refs_timelines_to_quotes,

                stat.num_refs_quotes_to_ideas,
                stat.num_refs_quotes_to_articles,
                stat.num_refs_quotes_to_people,
                stat.num_refs_quotes_to_timelines,
                stat.num_refs_quotes_to_quotes,
            ],
        )?;
    }

    Ok(())
}
#[allow(dead_code)]
fn as_naive_datetime(d: chrono::DateTime<chrono::Utc>) -> chrono::NaiveDateTime {
    chrono::NaiveDate::from_ymd(d.year(), d.month(), d.day()).and_hms(
        d.hour(),
        d.minute(),
        d.second(),
    )
}
