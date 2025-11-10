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

use crate::ServerConfig;
use crate::db::uploader as db;
use crate::db::{SqlitePool, db_thread};
use crate::error::Error;
use crate::handler::AuthUser;
use crate::interop::AtLeastParam;
use actix_multipart::Multipart;
use actix_web::Responder;
use actix_web::web::{Data, Json, Path};
use futures::TryStreamExt;
use std::ffi::OsStr;
use std::path::Path as StdPath;
use tokio::{fs, io::AsyncWriteExt};

pub async fn get_directory(AuthUser(user_id): AuthUser) -> crate::Result<impl Responder> {
    Ok(Json(user_id))
}

pub async fn get(
    sqlite_pool: Data<SqlitePool>,
    params: Path<AtLeastParam>,
    AuthUser(user_id): AuthUser,
) -> crate::Result<impl Responder> {
    let recent = db_thread(&sqlite_pool, move |conn| {
        db::get_recent(conn, user_id, params.at_least)
    })
    .await?;

    Ok(Json(recent))
}

pub async fn create(
    mut payload: Multipart,
    server_config: Data<ServerConfig>,
    sqlite_pool: Data<SqlitePool>,
    AuthUser(user_id): AuthUser,
) -> crate::Result<impl Responder> {
    let user_dir = format!("{}/{}", server_config.user_content_path, user_id);
    fs::create_dir_all(&user_dir).await?; // async mkdir -p

    let mut user_total_image_count =
        db_thread(&sqlite_pool, move |conn| db::get_image_count(conn, user_id)).await?;

    let mut upload_image_count = 0u64;

    while let Some(mut field) = payload.try_next().await? {
        let cd = field.content_disposition().ok_or(Error::BadUpload)?;
        let filename = cd.get_filename().ok_or(Error::BadUpload)?;
        let ext = get_extension(filename).ok_or(Error::BadUpload)?;
        let fourc = number_as_fourc(user_total_image_count)?;
        let derived = format!("{}.{}", fourc, ext);
        let path = format!("{}/{}", user_dir, derived);

        user_total_image_count += 1;
        upload_image_count += 1;

        let mut file = fs::File::create(&path).await?;
        while let Some(chunk) = field.try_next().await? {
            file.write_all(&chunk).await?;
        }

        db_thread(&sqlite_pool, move |conn| {
            db::add_image_entry(conn, user_id, derived)
        })
        .await?;
    }

    db_thread(&sqlite_pool, move |conn| {
        db::set_image_count(conn, user_id, user_total_image_count)
    })
    .await?;

    Ok(Json(upload_image_count))
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
