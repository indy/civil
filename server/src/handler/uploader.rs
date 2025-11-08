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

use crate::db::uploader as db;
use crate::db::SqlitePool;
use crate::error::Error;
use crate::handler::AuthUser;
use crate::ServerConfig;
use actix_multipart::Multipart;
use actix_web::web::{Data, Path};
use actix_web::HttpResponse;
use futures::{StreamExt, TryStreamExt};
use std::ffi::OsStr;
use std::io::Write;
use std::path::Path as StdPath;

use crate::interop::AtLeastParam;

#[allow(unused_imports)]
use tracing::info;

pub async fn get_directory(AuthUser(user_id): AuthUser) -> crate::Result<HttpResponse> {
    Ok(HttpResponse::Ok().json(user_id))
}

pub async fn get(
    sqlite_pool: Data<SqlitePool>,
    params: Path<AtLeastParam>,
    AuthUser(user_id): AuthUser,
) -> crate::Result<HttpResponse> {
    let recent = db::get_recent(&sqlite_pool, user_id, params.at_least).await?;

    Ok(HttpResponse::Ok().json(recent))
}

pub async fn create(
    mut payload: Multipart,
    server_config: Data<ServerConfig>,
    sqlite_pool: Data<SqlitePool>,
    AuthUser(user_id): AuthUser,
) -> crate::Result<HttpResponse> {
    let user_directory = format!("{}/{}", server_config.user_content_path, user_id);
    std::fs::DirBuilder::new()
        .recursive(true)
        .create(&user_directory)?;

    let mut user_total_image_count = db::get_image_count(&sqlite_pool, user_id).await?;
    let mut upload_image_count = 0;

    // iterate over multipart stream
    while let Ok(Some(mut field)) = payload.try_next().await {
        let content_type = field.content_disposition();
        let filename = content_type
            .expect("filename expected")
            .get_filename()
            .unwrap();

        let ext = get_extension(filename).unwrap();
        let fourc = number_as_fourc(user_total_image_count)?;

        let derived_filename = format!("{}.{}", fourc, ext);

        let filepath = format!("{}/{}", user_directory, derived_filename);

        user_total_image_count += 1;
        upload_image_count += 1;

        // todo: unwrap was added after the File::create - is this right?
        let mut f = tokio::task::spawn_blocking(|| std::fs::File::create(filepath).unwrap())
            .await
            .unwrap();

        // Field in turn is stream of *Bytes* object
        while let Some(chunk) = field.next().await {
            let data = chunk.unwrap();
            // filesystem operations are blocking, we have to use threadpool

            // todo: the await?.unwrap() code looks wrong
            f = tokio::task::spawn_blocking(move || f.write_all(&data).map(|_| f))
                .await?
                .unwrap();
        }

        // save the entry in the images table
        db::add_image_entry(&sqlite_pool, user_id, derived_filename).await?;
    }
    db::set_image_count(&sqlite_pool, user_id, user_total_image_count).await?;

    Ok(HttpResponse::Ok().json(upload_image_count))
}

fn get_extension(filename: &str) -> Option<&str> {
    StdPath::new(filename).extension().and_then(OsStr::to_str)
}

fn number_as_fourc(n: i32) -> crate::Result<String> {
    let res = format!("{:0>3}", format_radix(n as u32, 36)?);
    Ok(res)
}

fn format_radix(mut x: u32, radix: u32) -> crate::Result<String> {
    let mut result = vec![];

    loop {
        let m = x % radix;
        x /= radix;

        // will panic if you use a bad radix (< 2 or > 36).
        result.push(std::char::from_digit(m, radix).ok_or(Error::RadixConversion)?);
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
