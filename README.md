# Civil

## Server

rename .env.example to .env and update it for your environment


$ cargo run --bin server

setting the log level:
$ CIVIL_LOG=info cargo run --bin server

## Client

In the client directory, you can run:

### `npm start`

Runs the app in the development mode.<br>
Open [http://localhost:3000](http://localhost:3000) to view it in the browser.

### `npm test`

Launches the test runner in the interactive watch mode.<br>

### `npm run build`

Builds the app for production to the `build` folder.<br>
It correctly bundles React in production mode and optimizes the build for the best performance.

The build is minified and the filenames include the hashes.<br>

## Deploying

### Client
$ npm run build

this will build the client-side assets into server/www

### Server

modify .env so that WWW_PATH points to www
