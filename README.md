# Civil

A knowledge management system for the next 30 years. Developed at git.indy.io for my own use and mirrored on Github in case anyone wants to use it.

## Server

rename .env.example to .env and update it for your environment.

one time initialisation with:
```sh
$ make deps
```


```sh
$ make run
```

## Client
```sh
$ make wasm
```

## Release build

```sh
$ make release
```
The dist directory will contain the release build

## Deploying (to indy.io)

```sh
$ make upload
```

# Requirements
- A modern (for c.2020) web-browser
- Rust
- Make
- (Optional) Minify (https://github.com/tdewolff/minify)

install minify:
```sh
$ sudo apt install minify
```

if the minify binary is not installed on the build system then the unminified assets will be used
