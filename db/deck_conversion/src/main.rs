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

mod error;
mod pg;

use crate::error::Result;
use deadpool_postgres::Pool;
use dotenv;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::env;
use tokio_pg_mapper_derive::PostgresMapper;
use tokio_postgres::NoTls;
use tracing::info;
use tracing::Level;
use tracing_subscriber::FmtSubscriber;

pub type Key = i64;

#[derive(Debug, Clone, Serialize, Deserialize, PostgresMapper)]
#[pg_mapper(table = "edges2")]
pub struct Edge2 {
    pub id: Key,
}

#[derive(Debug, Clone, Serialize, Deserialize, PostgresMapper)]
#[pg_mapper(table = "decks")]
pub struct Deck {
    pub id: Key,
}

#[derive(Debug, Clone, Serialize, Deserialize, PostgresMapper)]
#[pg_mapper(table = "timespans")]
pub struct Timespan {
    pub id: Key,
}

struct Mapper {
    people_old_to_new: HashMap<Key, Key>,
    points_old_to_new: HashMap<Key, Key>,
    subjects_old_to_new: HashMap<Key, Key>,
    articles_old_to_new: HashMap<Key, Key>,
}

impl Mapper {
    fn new() -> Self {
        Self {
            people_old_to_new: HashMap::new(),
            points_old_to_new: HashMap::new(),
            subjects_old_to_new: HashMap::new(),
            articles_old_to_new: HashMap::new(),
        }
    }
}

/*
keep dates, locations, notes

derive decks, timespans, edges2 from people, points, articles, subjects, edges:
create decks for:
  people (+ timespans + edges2)
  points (+ edges2)
  subjects (+ edges2)
  articles (+ edges2)

create extra edges2 for people to subjects etc

delete people, points, articles, subjects, edges
*/

#[actix_rt::main]
async fn main() -> Result<()> {
    dotenv::dotenv().ok();

    // a builder for `FmtSubscriber`.
    let subscriber = FmtSubscriber::builder()
        .with_max_level(Level::TRACE)
        .finish();

    tracing::subscriber::set_global_default(subscriber).expect("setting default subscriber failed");

    let postgres_db = env::var("POSTGRES_DB")?;
    let postgres_host = env::var("POSTGRES_HOST")?;
    let postgres_user = env::var("POSTGRES_USER")?;
    let postgres_password = env::var("POSTGRES_PASSWORD")?;

    let cfg = deadpool_postgres::Config {
        user: Some(String::from(&postgres_user)),
        password: Some(String::from(&postgres_password)),
        dbname: Some(String::from(&postgres_db)),
        host: Some(String::from(&postgres_host)),
        ..Default::default()
    };

    let pool: Pool = cfg.create_pool(NoTls)?;

    let mut mapper = Mapper::new();

    convert_articles(&mut mapper, &pool).await?;
    convert_subjects(&mut mapper, &pool).await?;
    convert_points(&mut mapper, &pool).await?;
    convert_people(&mut mapper, &pool).await?;

    convert_edges(&mut mapper, &pool).await?;

    Ok(())
}

// --------------------------------------------------------------------------------
// --------------------------------------------------------------------------------
// --------------------------------------------------------------------------------
//                         Article
// --------------------------------------------------------------------------------
// --------------------------------------------------------------------------------
// --------------------------------------------------------------------------------

#[derive(Debug, Clone, Serialize, Deserialize, PostgresMapper)]
#[pg_mapper(table = "articles")]
struct Article {
    id: Key,
    title: String,
    source: Option<String>,
}

async fn convert_articles(mapper: &mut Mapper, db_pool: &Pool) -> Result<()> {
    // get all articles
    let db_articles = pg::many_non_transactional::<Article>(
        db_pool,
        "SELECT id, title, source FROM articles",
        &[],
    )
    .await?;

    // convert each article
    info!("we have {} articles", db_articles.len());
    let user_id: Key = 1;

    for article in db_articles {
        // create a deck corresponding to this article
        let article_deck = pg::one_non_transactional::<Deck>(
            db_pool,
            "INSERT INTO decks(user_id, kind, name, source) VALUES ($1, $2::TEXT::node_kind, $3, $4) RETURNING id",
            &[&user_id, &"article", &article.title, &article.source],
        ).await?;

        // update mapper
        mapper
            .articles_old_to_new
            .insert(article.id, article_deck.id);
    }

    Ok(())
}

// --------------------------------------------------------------------------------
// --------------------------------------------------------------------------------
// --------------------------------------------------------------------------------
//                         Subjects
// --------------------------------------------------------------------------------
// --------------------------------------------------------------------------------
// --------------------------------------------------------------------------------

#[derive(Debug, Clone, Serialize, Deserialize, PostgresMapper)]
#[pg_mapper(table = "subjects")]
struct Subject {
    id: Key,
    name: String,
}

async fn convert_subjects(mapper: &mut Mapper, db_pool: &Pool) -> Result<()> {
    // get all subjects
    let db_subjects =
        pg::many_non_transactional::<Subject>(db_pool, "SELECT id, name FROM subjects", &[])
            .await?;

    // convert each subject
    info!("we have {} subjects", db_subjects.len());
    let user_id: Key = 1;

    for subject in db_subjects {
        // create a deck corresponding to this subject
        let subject_deck = pg::one_non_transactional::<Deck>(
            db_pool,
            "INSERT INTO decks(user_id, kind, name) VALUES ($1, $2::TEXT::node_kind, $3) RETURNING id",
            &[&user_id, &"subject", &subject.name],
        ).await?;

        // update mapper
        mapper
            .subjects_old_to_new
            .insert(subject.id, subject_deck.id);
    }

    Ok(())
}

// --------------------------------------------------------------------------------
// --------------------------------------------------------------------------------
// --------------------------------------------------------------------------------
//                         Historic Points
// --------------------------------------------------------------------------------
// --------------------------------------------------------------------------------
// --------------------------------------------------------------------------------

#[derive(Debug, Deserialize, PostgresMapper, Serialize)]
#[pg_mapper(table = "historic_points")]
struct Point {
    id: Key,
    title: String,
    date_id: Option<Key>,
    location_id: Option<Key>,
}

async fn convert_points(mapper: &mut Mapper, db_pool: &Pool) -> Result<()> {
    // get all points
    let db_points = pg::many_non_transactional::<Point>(
        db_pool,
        "SELECT id, title, date_id, location_id FROM historic_points",
        &[],
    )
    .await?;

    // convert each point
    info!("we have {} points", db_points.len());
    let user_id: Key = 1;

    for point in db_points {
        // create a deck corresponding to this point
        let point_deck = pg::one_non_transactional::<Deck>(
            db_pool,
            "INSERT INTO decks(user_id, kind, name, date_id, location_id) VALUES ($1, $2::TEXT::node_kind, $3, $4, $5) RETURNING id",
            &[&user_id, &"historic_point", &point.title, &point.date_id, &point.location_id],
        ).await?;

        // update mapper
        mapper.points_old_to_new.insert(point.id, point_deck.id);
    }

    Ok(())
}

// --------------------------------------------------------------------------------
// --------------------------------------------------------------------------------
// --------------------------------------------------------------------------------
//                         Historic People
// --------------------------------------------------------------------------------
// --------------------------------------------------------------------------------
// --------------------------------------------------------------------------------

#[derive(Debug, Deserialize, PostgresMapper, Serialize)]
#[pg_mapper(table = "historic_people")]
struct Person {
    id: Key,
    name: String,
    age: Option<String>,

    birth_date_id: Key,
    birth_location_id: Key,
    death_date_id: Option<Key>,
    death_location_id: Option<Key>,
}

async fn convert_people(mapper: &mut Mapper, db_pool: &Pool) -> Result<()> {
    // get all people
    let db_people = pg::many_non_transactional::<Person>(
        db_pool,
        "SELECT id, name, age, birth_date_id, birth_location_id, death_date_id, death_location_id FROM historic_people",
        &[],
    ).await?;

    // convert each point
    info!("we have {} people", db_people.len());
    let user_id: Key = 1;

    for person in db_people {
        // create a timespan for this person's life
        let timespan = pg::one_non_transactional::<Timespan>(
            db_pool,
            "INSERT INTO timespans(textual, date_start_id, date_end_id) VALUES ($1, $2, $3) RETURNING id",
            &[&person.age, &person.birth_date_id, &person.death_date_id],
        ).await?;

        // create a deck corresponding to this point
        let person_deck = pg::one_non_transactional::<Deck>(
            db_pool,
            "INSERT INTO decks(user_id, kind, name, timespan_id, location_id, location2_id) VALUES ($1, $2::TEXT::node_kind, $3, $4, $5, $6) RETURNING id",
            &[&user_id, &"historic_person", &person.name, &timespan.id, &person.birth_location_id, &person.death_location_id],
        ).await?;

        // update mapper
        mapper.people_old_to_new.insert(person.id, person_deck.id);
    }

    Ok(())
}

// --------------------------------------------------------------------------------
// --------------------------------------------------------------------------------
// --------------------------------------------------------------------------------
//                         Edges
// --------------------------------------------------------------------------------
// --------------------------------------------------------------------------------
// --------------------------------------------------------------------------------

#[derive(Debug, Deserialize, PostgresMapper, Serialize)]
#[pg_mapper(table = "edges")]
struct Edge {
    id: Key,
    edge_type: i32,
    historic_person_id: Option<Key>,
    note_id: Option<Key>,
    subject_id: Option<Key>,
    article_id: Option<Key>,
    historic_point_id: Option<Key>,
}

/*
select edge_type, count(*) from edges group by edge_type;

edge_type | count
-----------+-------
        31 |    26  Subject to Note
        51 |    32  HistoricPoint to Note
        13 |     6  Note to Subject
        41 |   165  Article to Note
        21 |   298  HistoricPerson to Note
        12 |    94  Note to HistoricPerson
(6 rows)
*/

async fn convert_edges(mapper: &mut Mapper, db_pool: &Pool) -> Result<()> {
    let db_edges = pg::many_non_transactional::<Edge>(
        db_pool,
        "SELECT id, edge_type, historic_person_id, note_id, subject_id, article_id, historic_point_id from edges",
        &[]).await?;

    for edge in db_edges {
        // subject to note
        if edge.edge_type == 31 {
            let note_id = edge.note_id.unwrap();
            let old_subject_id = edge.subject_id.unwrap();
            if let Some(subject_id) = mapper.subjects_old_to_new.get(&old_subject_id) {
                let _ = pg::one_non_transactional::<Edge2>(
                    db_pool,
                    "INSERT INTO edges2(from_kind, to_kind, from_deck_id, to_note_id) VALUES ($1::TEXT::node_kind, $2::TEXT::node_kind, $3, $4) RETURNING id",
                    &[&"subject", &"note", &subject_id, &note_id],
                ).await?;
            }
        }

        // historic point to note
        if edge.edge_type == 51 {
            let note_id = edge.note_id.unwrap();
            let old_point_id = edge.historic_point_id.unwrap();
            if let Some(point_id) = mapper.points_old_to_new.get(&old_point_id) {
                let _ = pg::one_non_transactional::<Edge2>(
                    db_pool,
                    "INSERT INTO edges2(from_kind, to_kind, from_deck_id, to_note_id) VALUES ($1::TEXT::node_kind, $2::TEXT::node_kind, $3, $4) RETURNING id",
                    &[&"historic_point", &"note", &point_id, &note_id],
                ).await?;
            }
        }

        // note to subject
        if edge.edge_type == 13 {
            let note_id = edge.note_id.unwrap();
            let old_subject_id = edge.subject_id.unwrap();
            if let Some(subject_id) = mapper.subjects_old_to_new.get(&old_subject_id) {
                let _ = pg::one_non_transactional::<Edge2>(
                    db_pool,
                    "INSERT INTO edges2(from_kind, to_kind, from_note_id, to_deck_id) VALUES ($1::TEXT::node_kind, $2::TEXT::node_kind, $3, $4) RETURNING id",
                    &[&"note", &"subject", &note_id, &subject_id],
                ).await?;
            }
        }

        // article to note
        if edge.edge_type == 41 {
            let note_id = edge.note_id.unwrap();
            let old_article_id = edge.article_id.unwrap();
            if let Some(article_id) = mapper.articles_old_to_new.get(&old_article_id) {
                let _ = pg::one_non_transactional::<Edge2>(
                    db_pool,
                    "INSERT INTO edges2(from_kind, to_kind, from_deck_id, to_note_id) VALUES ($1::TEXT::node_kind, $2::TEXT::node_kind, $3, $4) RETURNING id",
                    &[&"article", &"note", &article_id, &note_id],
                ).await?;
            }
        }

        // person to note
        if edge.edge_type == 21 {
            let note_id = edge.note_id.unwrap();
            let old_person_id = edge.historic_person_id.unwrap();
            if let Some(person_id) = mapper.people_old_to_new.get(&old_person_id) {
                let _ = pg::one_non_transactional::<Edge2>(
                    db_pool,
                    "INSERT INTO edges2(from_kind, to_kind, from_deck_id, to_note_id) VALUES ($1::TEXT::node_kind, $2::TEXT::node_kind, $3, $4) RETURNING id",
                    &[&"historic_person", &"note", &person_id, &note_id],
                ).await?;
            }
        }

        // note to historic person
        if edge.edge_type == 12 {
            let note_id = edge.note_id.unwrap();
            let old_person_id = edge.historic_person_id.unwrap();
            if let Some(person_id) = mapper.people_old_to_new.get(&old_person_id) {
                let _ = pg::one_non_transactional::<Edge2>(
                    db_pool,
                    "INSERT INTO edges2(from_kind, to_kind, from_note_id, to_deck_id) VALUES ($1::TEXT::node_kind, $2::TEXT::node_kind, $3, $4) RETURNING id",
                    &[&"note", &"historic_person", &note_id, &person_id],
                ).await?;
            }
        }
    }

    Ok(())
}
