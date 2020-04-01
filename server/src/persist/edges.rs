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

use super::pg;
use crate::error::{Error, Result};
use crate::interop::decks as decks_interop;
use crate::interop::edges as interop;
use crate::interop::tags as tags_interop;
use crate::interop::{model_to_deck_kind, Key, Model};
use crate::persist::tags as tags_db;
use deadpool_postgres::{Client, Pool, Transaction};
use serde::{Deserialize, Serialize};
use tokio_pg_mapper_derive::PostgresMapper;

#[allow(unused_imports)]
use tracing::info;

#[derive(Debug, Deserialize, PostgresMapper, Serialize)]
#[pg_mapper(table = "notes_decks")]
struct NoteDeckEdge {
    note_id: Key,
    deck_id: Key,
}

impl From<NoteDeckEdge> for interop::Edge {
    fn from(e: NoteDeckEdge) -> interop::Edge {
        interop::Edge {
            from_deck_id: None,
            to_deck_id: Some(e.deck_id),
            from_note_id: Some(e.note_id),
            to_note_id: None,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, PostgresMapper)]
#[pg_mapper(table = "tags")]
struct TagReference {
    note_id: Key,
    id: Key,
    name: String,
}

impl From<TagReference> for tags_interop::TagReference {
    fn from(t: TagReference) -> tags_interop::TagReference {
        tags_interop::TagReference {
            note_id: t.note_id,
            id: t.id,
            name: t.name,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, PostgresMapper)]
#[pg_mapper(table = "decks")]
struct DeckReference {
    note_id: Key,
    id: Key,
    name: String,
    kind: String,
}

impl From<DeckReference> for decks_interop::DeckReference {
    fn from(d: DeckReference) -> decks_interop::DeckReference {
        let resource = match d.kind.as_ref() {
            "historic_person" => "people",
            "historic_point" => "points",
            "subject" => "subjects",
            "article" => "articles",
            "book" => "books",
            _ => "unknown",
        };
        decks_interop::DeckReference {
            note_id: d.note_id,
            id: d.id,
            name: d.name,
            resource: resource.to_string(),
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, PostgresMapper)]
#[pg_mapper(table = "decks")]
struct DeckMention {
    id: Key,
    name: String,
}

impl From<DeckMention> for decks_interop::DeckMention {
    fn from(d: DeckMention) -> decks_interop::DeckMention {
        decks_interop::DeckMention {
            id: d.id,
            name: d.name,
        }
    }
}

pub(crate) async fn create_from_note_to_tags(
    db_pool: &Pool,
    edge: &interop::CreateEdgeFromNoteToTags,
    user_id: Key,
) -> Result<()> {
    let mut client: Client = db_pool.get().await.map_err(Error::DeadPool)?;
    let tx = client.transaction().await?;

    let note_id = edge.note_id;
    let stmt = include_str!("sql/edges_create_from_note_to_tag.sql");

    // create the new tags and create edges from the note to them
    //
    for new_tag_name in &edge.new_tag_names {
        // todo(<2020-03-30 Mon>): additional check to make sure that this tag doesn't already exist
        let tag = tags_db::create_tx(&tx, user_id, &new_tag_name).await?;
        pg::zero(&tx, &stmt, &[&note_id, &tag.id]).await?;
    }

    // create edges to existing tags
    for existing_tag_id in &edge.existing_tag_ids {
        pg::zero(&tx, &stmt, &[&note_id, &existing_tag_id]).await?;
    }

    tx.commit().await?;

    Ok(())
}

pub(crate) async fn create_from_note_to_deck(
    db_pool: &Pool,
    edge: &interop::CreateEdge,
    _user_id: Key,
) -> Result<interop::Edge> {
    let to_id: Key;

    // todo: make this code good
    if let Some(id) = edge.person_id {
        to_id = id;
    } else if let Some(id) = edge.subject_id {
        to_id = id;
    } else {
        return Err(Error::ModelConversion);
    };

    let note_id;
    if let Some(id) = edge.note_id {
        note_id = id;
    } else {
        return Err(Error::MissingField);
    }

    let stmt = include_str!("sql/edges_create_from_note_to_deck.sql");

    pg::one_from::<NoteDeckEdge, interop::Edge>(db_pool, &stmt, &[&note_id, &to_id]).await
}

pub(crate) async fn delete(db_pool: &Pool, edge_id: Key, _user_id: Key) -> Result<()> {
    let mut client: Client = db_pool.get().await.map_err(Error::DeadPool)?;
    let tx = client.transaction().await?;

    let stmt = pg::delete_statement(Model::Edge)?;

    pg::zero(&tx, &stmt, &[&edge_id]).await?;

    tx.commit().await?;

    Ok(())
}

pub(crate) async fn create_from_deck_to_note(
    tx: &Transaction<'_>,
    deck_id: Key,
    note_id: Key,
) -> Result<()> {
    let stmt = include_str!("sql/edges_create_from_deck_to_note.sql");

    // normally a pg::one for create, but we're not going
    // to return anything when creating an edge
    //
    pg::zero(tx, &stmt, &[&deck_id, &note_id]).await?;

    Ok(())
}

pub(crate) async fn delete_all_edges_connected_with_deck(
    tx: &Transaction<'_>,
    deck_id: Key,
) -> Result<()> {
    pg::zero(
        tx,
        &include_str!("sql/edges_delete_decks_notes_with_deck_id.sql"),
        &[&deck_id],
    )
    .await?;
    pg::zero(
        tx,
        &include_str!("sql/edges_delete_notes_decks_with_deck_id.sql"),
        &[&deck_id],
    )
    .await?;

    Ok(())
}

pub(crate) async fn delete_all_edges_connected_with_note(
    tx: &Transaction<'_>,
    note_id: Key,
) -> Result<()> {
    pg::zero(
        tx,
        &include_str!("sql/edges_delete_notes_tags_with_note_id.sql"),
        &[&note_id],
    )
    .await?;
    pg::zero(
        tx,
        &include_str!("sql/edges_delete_decks_notes_with_note_id.sql"),
        &[&note_id],
    )
    .await?;
    pg::zero(
        tx,
        &include_str!("sql/edges_delete_notes_decks_with_note_id.sql"),
        &[&note_id],
    )
    .await?;
    pg::zero(
        tx,
        &include_str!("sql/edges_delete_ideas_notes_with_note_id.sql"),
        &[&note_id],
    )
    .await?;

    Ok(())
}

// return all the tags attached to the given deck's notes
// e.g. from_deck_id_via_notes_to_tags(db_pool, subject_id)
// will return all the tags from the notes in the given subject
//
pub(crate) async fn from_deck_id_via_notes_to_tags(
    db_pool: &Pool,
    deck_id: Key,
) -> Result<Vec<tags_interop::TagReference>> {
    let stmt = include_str!("sql/from_deck_id_via_notes_to_tags.sql");

    let referenced =
        pg::many_from::<TagReference, tags_interop::TagReference>(db_pool, &stmt, &[&deck_id])
            .await?;

    Ok(referenced)
}

// return all the referenced decks in the given deck
// e.g. from_deck_id_via_notes_to_decks(db_pool, subject_id)
// will return all the people, books, articles, subjects etc mentioned in the given subject
//
pub(crate) async fn from_deck_id_via_notes_to_decks(
    db_pool: &Pool,
    deck_id: Key,
) -> Result<Vec<decks_interop::DeckReference>> {
    let stmt = include_str!("sql/from_deck_id_via_notes_to_decks.sql");

    let referenced =
        pg::many_from::<DeckReference, decks_interop::DeckReference>(db_pool, &stmt, &[&deck_id])
            .await?;

    Ok(referenced)
}

// return all the decks of a certain kind that mention another particular deck.
// e.g. from_decks_via_notes_to_deck_id(db_pool, Model::HistoricPerson, subject_id)
// will return all the people who mention the given subject, ordered by number of references
//
pub(crate) async fn from_decks_via_notes_to_deck_id(
    db_pool: &Pool,
    source_model: Model,
    mentioned_id: Key,
) -> Result<Vec<decks_interop::DeckMention>> {
    let from_kind = model_to_deck_kind(source_model)?;

    let stmt = include_str!("sql/from_decks_via_notes_to_deck_id.sql");
    let stmt = stmt.replace("$from_kind", from_kind);

    let mentioned =
        pg::many_from::<DeckMention, decks_interop::DeckMention>(db_pool, &stmt, &[&mentioned_id])
            .await?;

    Ok(mentioned)
}
