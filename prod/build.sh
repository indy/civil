#!/bin/sh

cd ../client
npm run build

cd ../server
cargo build --release
cp target/release/server ../prod/dist/.
cp .env.example ../prod/dist/.
cp -r errors ../prod/dist/.

cd ../prod
cp -r systemd dist/.

rsync -avzhe ssh dist/. indy@indy.io:/home/indy/work/civil
