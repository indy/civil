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
use crate::interop::{kind_to_resource, model_to_deck_kind, Key, Model};
use crate::persist::tags as tags_db;
use deadpool_postgres::{Client, Pool, Transaction};
use serde::{Deserialize, Serialize};
use tokio_pg_mapper_derive::PostgresMapper;

#[allow(unused_imports)]
use tracing::info;

#[derive(Debug, Clone, Serialize, Deserialize, PostgresMapper)]
#[pg_mapper(table = "decks")]
pub struct MarginConnectionToDeck {
    pub note_id: Key,
    pub id: Key,
    pub name: String,
    pub kind: String,
}

impl From<MarginConnectionToDeck> for interop::MarginConnection {
    fn from(e: MarginConnectionToDeck) -> interop::MarginConnection {
        let resource = kind_to_resource(e.kind.as_ref()).unwrap();
        interop::MarginConnection {
            note_id: e.note_id,
            id: e.id,
            name: e.name,
            resource: resource.to_string(),
        }
    }
}

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

impl From<TagReference> for interop::MarginConnection {
    fn from(t: TagReference) -> interop::MarginConnection {
        interop::MarginConnection {
            note_id: t.note_id,
            id: t.id,
            name: t.name,
            resource: String::from("tags"),
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

impl From<DeckReference> for interop::MarginConnection {
    fn from(d: DeckReference) -> interop::MarginConnection {
        let resource = kind_to_resource(d.kind.as_ref()).unwrap();
        interop::MarginConnection {
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

fn is_tag_associated_with_note(new_tag_id: Key, existing_tags: &Vec<tags_db::Tag>) -> bool {
    for existing in existing_tags {
        if existing.id == new_tag_id {
            return true;
        }
    }
    false
}

fn is_deck_associated_with_note(
    new_deck_id: Key,
    existing_decks: &Vec<MarginConnectionToDeck>,
) -> bool {
    for existing in existing_decks {
        if existing.id == new_deck_id {
            return true;
        }
    }
    false
}

fn is_key_in_keys(k: Key, keys: &Vec<Key>) -> bool {
    for key in keys {
        if k == *key {
            return true;
        }
    }
    false
}

pub(crate) async fn create_from_note_to_tags(
    db_pool: &Pool,
    edge: &interop::CreateEdgeFromNoteToTags,
    user_id: Key,
) -> Result<Vec<tags_interop::Tag>> {
    let mut client: Client = db_pool.get().await.map_err(Error::DeadPool)?;
    let tx = client.transaction().await?;

    let note_id = edge.note_id;
    let stmt_all_tags = include_str!("sql/tags_all_for_note.sql");

    // get the list of existing tags associated with this note
    let associated_tags: Vec<tags_db::Tag> =
        pg::many::<tags_db::Tag>(&tx, &stmt_all_tags, &[&note_id]).await?;

    // remove tags that are in associated_tags but not in edge.existing_tag_ids
    let stmt_delete_tag = include_str!("sql/edges_delete_notes_tags.sql");
    for associated_tag in &associated_tags {
        if !is_key_in_keys(associated_tag.id, &edge.existing_tag_ids) {
            // this tag has been removed from the note by the user
            pg::zero(&tx, &stmt_delete_tag, &[&note_id, &associated_tag.id]).await?;
        }
    }

    let stmt_attach_tag = include_str!("sql/edges_create_from_note_to_tag.sql");

    // create any new edges from the note to already existing tags
    for existing_tag_id in &edge.existing_tag_ids {
        if !is_tag_associated_with_note(*existing_tag_id, &associated_tags) {
            pg::zero(&tx, &stmt_attach_tag, &[&note_id, &existing_tag_id]).await?;
        }
    }

    // create new tags and create edges from the note to them
    //
    for new_tag_name in &edge.new_tag_names {
        // todo(<2020-03-30 Mon>): additional check to make sure that this tag doesn't already exist
        // it's a stupid thing that could happen if:
        // 1. a user has the same deck open in two windows
        // 2. adds a new tag to a note in one window
        // 3. adds the same new tag in the other window
        //
        let tag = tags_db::create_tx(&tx, user_id, &new_tag_name).await?;
        pg::zero(&tx, &stmt_attach_tag, &[&note_id, &tag.id]).await?;
    }

    tx.commit().await?;

    // return a list of [tag_id, name] containing the complete set of tags associated with this note.
    pg::many_from::<tags_db::Tag, tags_interop::Tag>(db_pool, &stmt_all_tags, &[&note_id]).await
}

pub(crate) async fn create_from_note_to_decks(
    db_pool: &Pool,
    edge: &interop::CreateEdgeFromNoteToDecks,
) -> Result<Vec<interop::MarginConnection>> {
    let mut client: Client = db_pool.get().await.map_err(Error::DeadPool)?;
    let tx = client.transaction().await?;

    let note_id = edge.note_id;
    let stmt_all_decks = include_str!("sql/decks_all_for_note.sql");

    // get the list of existing tags associated with this note
    let associated_decks: Vec<MarginConnectionToDeck> = // todo: just need the id?
        pg::many::<MarginConnectionToDeck>(&tx, &stmt_all_decks, &[&note_id]).await?;

    // remove decks that are in associated_decks but not in edge.deck_ids
    let stmt_delete_deck = include_str!("sql/edges_delete_notes_decks.sql");
    for associated_deck in &associated_decks {
        if !is_key_in_keys(associated_deck.id, &edge.deck_ids) {
            // this deck has been removed from the note by the user
            info!("deleting {}, {}", &note_id, &associated_deck.id);
            pg::zero(&tx, &stmt_delete_deck, &[&note_id, &associated_deck.id]).await?;
        }
    }

    let stmt_attach_deck = include_str!("sql/edges_create_from_note_to_deck.sql");

    // create any new edges from the note to already existing tags
    for deck_id in &edge.deck_ids {
        if !is_deck_associated_with_note(*deck_id, &associated_decks) {
            info!("creating {}, {}", &note_id, &deck_id);
            pg::zero(&tx, &stmt_attach_deck, &[&note_id, &deck_id]).await?;
        }
    }

    tx.commit().await?;

    // return a list of [tag_id, name, resource] containing the complete set of tags associated with this note.
    pg::many_from::<MarginConnectionToDeck, interop::MarginConnection>(
        db_pool,
        &stmt_all_decks,
        &[&note_id],
    )
    .await
}

pub(crate) async fn delete(db_pool: &Pool, edge_id: Key, _user_id: Key) -> Result<()> {
    let mut client: Client = db_pool.get().await.map_err(Error::DeadPool)?;
    let tx = client.transaction().await?;

    let stmt = pg::delete_statement(Model::Edge)?;

    pg::zero(&tx, &stmt, &[&edge_id]).await?;

    tx.commit().await?;

    Ok(())
}

pub(crate) async fn create_from_tag_to_note(
    tx: &Transaction<'_>,
    tag_id: Key,
    note_id: Key,
) -> Result<()> {
    let stmt = include_str!("sql/edges_create_from_tag_to_note.sql");

    // normally a pg::one for create, but we're not going
    // to return anything when creating an edge
    //
    pg::zero(tx, &stmt, &[&tag_id, &note_id]).await?;

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

pub(crate) async fn delete_all_edges_connected_with_tag(
    tx: &Transaction<'_>,
    tag_id: Key,
) -> Result<()> {
    pg::zero(
        tx,
        &include_str!("sql/edges_delete_tags_notes_with_tag_id.sql"),
        &[&tag_id],
    )
    .await?;
    pg::zero(
        tx,
        &include_str!("sql/edges_delete_notes_tags_with_tag_id.sql"),
        &[&tag_id],
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

pub(crate) async fn from_tag_id_via_notes_to_tags(
    db_pool: &Pool,
    tag_id: Key,
) -> Result<Vec<interop::MarginConnection>> {
    let stmt = include_str!("sql/from_tag_id_via_notes_to_tags.sql");

    let referenced =
        pg::many_from::<TagReference, interop::MarginConnection>(db_pool, &stmt, &[&tag_id])
            .await?;

    Ok(referenced)
}

pub(crate) async fn from_tag_id_via_notes_to_decks(
    db_pool: &Pool,
    tag_id: Key,
) -> Result<Vec<interop::MarginConnection>> {
    let stmt = include_str!("sql/from_tag_id_via_notes_to_decks.sql");

    let referenced =
        pg::many_from::<DeckReference, interop::MarginConnection>(db_pool, &stmt, &[&tag_id])
            .await?;

    Ok(referenced)
}

// return all the tags attached to the given deck's notes
// e.g. from_deck_id_via_notes_to_tags(db_pool, article_id)
// will return all the tags from the notes in the given article
//
pub(crate) async fn from_deck_id_via_notes_to_tags(
    db_pool: &Pool,
    deck_id: Key,
) -> Result<Vec<interop::MarginConnection>> {
    let stmt = include_str!("sql/from_deck_id_via_notes_to_tags.sql");

    let referenced =
        pg::many_from::<TagReference, interop::MarginConnection>(db_pool, &stmt, &[&deck_id])
            .await?;

    Ok(referenced)
}

// return all the referenced decks in the given deck
// e.g. from_deck_id_via_notes_to_decks(db_pool, article_id)
// will return all the people, points, books, articles etc mentioned in the given article
//
pub(crate) async fn from_deck_id_via_notes_to_decks(
    db_pool: &Pool,
    deck_id: Key,
) -> Result<Vec<interop::MarginConnection>> {
    let stmt = include_str!("sql/from_deck_id_via_notes_to_decks.sql");

    let referenced =
        pg::many_from::<DeckReference, interop::MarginConnection>(db_pool, &stmt, &[&deck_id])
            .await?;

    Ok(referenced)
}

// return all the decks of a certain kind that mention another particular deck.
// e.g. from_decks_via_notes_to_deck_id(db_pool, Model::HistoricPerson, article_id)
// will return all the people who mention the given article, ordered by number of references
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
