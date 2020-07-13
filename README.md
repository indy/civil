# Civil

## Server

rename server/.env.example to server/.env and update it for your environment

$ cd server && cargo run

## Client

$ make wasm
$ cd client && npm start

## Deploying

$ make upload


## (Dev) loading a test database

- copy a backup from the server (e.g. civil_20201116.psql)
- create a local database: $ createdb civil_20201116
- load in the backup: psql civil_20201116 < civil_20201116.psql
- update the .env variables

- restart the server, login, may need an additional refresh to display the db name
