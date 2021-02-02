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

#[derive(Debug, Eq, PartialEq, serde::Deserialize, serde::Serialize)]
pub struct Stats {
    pub num_ideas: i32,
    pub num_publications: i32,
    pub num_people: i32,
    pub num_timelines: i32,

    pub num_refs: i32,
    pub num_cards: i32,
    pub num_card_ratings: i32,
    pub num_images: i32,

    pub num_notes_in_ideas: i32,
    pub num_notes_in_publications: i32,
    pub num_notes_in_people: i32,
    pub num_notes_in_timelines: i32,

    pub num_points_in_people: i32,
    pub num_points_in_timelines: i32,

    pub num_refs_ideas_to_ideas: i32,
    pub num_refs_ideas_to_publications: i32,
    pub num_refs_ideas_to_people: i32,
    pub num_refs_ideas_to_timelines: i32,

    pub num_refs_publications_to_ideas: i32,
    pub num_refs_publications_to_publications: i32,
    pub num_refs_publications_to_people: i32,
    pub num_refs_publications_to_timelines: i32,

    pub num_refs_people_to_ideas: i32,
    pub num_refs_people_to_publications: i32,
    pub num_refs_people_to_people: i32,
    pub num_refs_people_to_timelines: i32,

    pub num_refs_timelines_to_ideas: i32,
    pub num_refs_timelines_to_publications: i32,
    pub num_refs_timelines_to_people: i32,
    pub num_refs_timelines_to_timelines: i32,
}
