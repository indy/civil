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

use crate::error::{Error, Result};
use crate::session;

use crate::db::uploader as db;

use std::ffi::OsStr;
use std::path::Path;

use actix_multipart::Multipart;
use actix_web::web::Data;
use actix_web::{web, HttpResponse};
use deadpool_postgres::Pool;
use futures::{StreamExt, TryStreamExt};
use std::io::Write;

#[allow(unused_imports)]
use tracing::info;

pub async fn get_directory(session: actix_session::Session) -> Result<HttpResponse> {
    info!("get_directory");

    let user_id = session::user_id(&session)?;

    Ok(HttpResponse::Ok().json(user_id))
}

pub async fn get(db_pool: Data<Pool>, session: actix_session::Session) -> Result<HttpResponse> {
    info!("get_recent_uploads");

    let user_id = session::user_id(&session)?;

    let recent = db::get_recent(&db_pool, user_id).await?;

    Ok(HttpResponse::Ok().json(recent))
}

pub async fn create(
    mut payload: Multipart,
    db_pool: Data<Pool>,
    session: actix_session::Session,
) -> Result<HttpResponse> {
    let user_id = session::user_id(&session)?;

    // create the user specific directory
    let user_directory = format!("../user-content/{}", user_id);
    std::fs::DirBuilder::new()
        .recursive(true)
        .create(&user_directory)?;

    let mut user_image_count = db::get_image_count(&db_pool, user_id).await?;

    // iterate over multipart stream
    while let Ok(Some(mut field)) = payload.try_next().await {
        let content_type = field.content_disposition().unwrap();
        let filename = content_type.get_filename().unwrap();

        let ext = get_extension(filename).unwrap();
        let fourc = number_as_fourc(user_image_count)?;

        let derived_filename = format!("{}.{}", fourc, ext);

        let filepath = format!("{}/{}", user_directory, derived_filename);

        user_image_count += 1;
        db::set_image_count(&db_pool, user_id, user_image_count).await?;

        let mut f = web::block(|| std::fs::File::create(filepath))
            .await
            .unwrap();
        // Field in turn is stream of *Bytes* object
        while let Some(chunk) = field.next().await {
            let data = chunk.unwrap();
            // filesystem operations are blocking, we have to use threadpool
            f = web::block(move || f.write_all(&data).map(|_| f)).await?;
        }

        // save the entry in the images table

        db::add_image_entry(&db_pool, user_id, &derived_filename).await?;
    }
    Ok(HttpResponse::Ok().into())
}

fn get_extension(filename: &str) -> Option<&str> {
    Path::new(filename).extension().and_then(OsStr::to_str)
}

fn number_as_fourc(n: i32) -> Result<String> {
    let res = format!("{:0>3}", format_radix(n as u32, 36)?);
    Ok(res)
}

fn format_radix(mut x: u32, radix: u32) -> Result<String> {
    let mut result = vec![];

    loop {
        let m = x % radix;
        x = x / radix;

        // will panic if you use a bad radix (< 2 or > 36).
        result.push(std::char::from_digit(m, radix).ok_or_else(|| Error::RadixConversion)?);
        if x == 0 {
            break;
        }
    }

    Ok(result.into_iter().rev().collect())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_fourc_generation() {
        assert_eq!(number_as_fourc(0).unwrap().to_string(), "000");
        assert_eq!(number_as_fourc(1234).unwrap().to_string(), "0ya");
    }
}
