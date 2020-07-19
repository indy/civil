# Civil

A knowledge management system for the next 30 years

## Server

rename server/.env.example to server/.env and update it for your environment

$ cd server && cargo run

## Client

$ make wasm

## Deploying

$ make upload

## (Dev) loading a test database

- copy a backup from the server (e.g. civil_20201116.psql)
- create a local database: $ createdb civil_20201116
- load in the backup: psql civil_20201116 < civil_20201116.psql
- update the .env variables

- restart the server, login, may need an additional refresh to display the db name

## (Dev) generating the library js files

preact.js:
package.json script in preact project:
"isg": "microbundle -i src/index.js -o dist/isg-bundle.js --no-pkg-main --no-compress -f es",
then rename dist/isg-bundle.module.js to preact.js

hooks.js:
go into the preact project's hooks/src directory, copy index.js to hooks.js updating the import declaration.

htm:
manually copied build.mjs from the project and made changes

preact-router:
manually copied over and made changes
