default: run;

########################################
#
#   BUILDING
#
# 	Build debug server and run
# 	$ make run
#
# 	Copy staging directory onto peru
# 	$ make upload
#
#   HELP DURING DEVELOPMENT
#
# 	Download images from the server:
# 	$ make download-images
#
########################################

################################################################################
# preamble
################################################################################

# bash is default
SHELL := bash
MAKEFLAGS += --warn-undefined-variables
MAKEFLAGS += --no-builtin-rules

################################################################################
# utils
################################################################################
# NOTE: have to declare utils at the top of the file, before they're used

# Make doesn't come with a recursive wildcard function so we have to use this:
#
rwildcard=$(foreach d,$(wildcard $(1:=/*)),$(call rwildcard,$d,$2) $(filter $(subst *,%,$2),$d))

# check if minify is installed
MINIFY := $(shell command -v minify 2> /dev/null)

# note: usage of mkdir -p $(@D)
# $(@D), means "the directory the current target resides in"
# using it to make sure that a staging directory is created


################################################################################
# variables
################################################################################

SERVER_BINARY = civil_server

CLIENT_WASM_NAME = civil_wasm
CLIENT_WASM = $(CLIENT_WASM_NAME).wasm
CLIENT_WASM_BG = $(CLIENT_WASM_NAME)_bg.wasm

SERVER_FOLDER = server
CLIENT_FOLDER = client
SHARED_FOLDER = shared

WWW_FOLDER = client/www
WASM_FOLDER = client/wasm

################################################################################
# filesets
################################################################################

CLIENT_FILES = $(call rwildcard,$(CLIENT_FOLDER)/src,*)
# CLIENT_FILES = $(call rwildcard,$(WWW_FOLDER),*)
SERVER_FILES = $(call rwildcard,$(SERVER_FOLDER)/src,*) $(SERVER_FOLDER)/Cargo.toml
SYSTEMD_FILES = $(wildcard misc/systemd/*)

WASM_FILES = $(wildcard $(WASM_FOLDER)/src/*) $(WASM_FOLDER)/Cargo.toml
SHARED_FILES = $(wildcard $(SHARED_FOLDER)/src/*) $(SHARED_FOLDER)/Cargo.toml

################################################################################
# targets
################################################################################

$(SERVER_FOLDER)/target/debug/$(SERVER_BINARY): $(SERVER_FILES) $(SHARED_FILES)
	cargo build --manifest-path $(SERVER_FOLDER)/Cargo.toml --bin $(SERVER_BINARY)
$(SERVER_FOLDER)/target/debug/civil_stat_collector: $(SERVER_FILES)
	cargo build --manifest-path $(SERVER_FOLDER)/Cargo.toml --bin civil_stat_collector

$(SERVER_FOLDER)/target/release/$(SERVER_BINARY): $(SERVER_FILES) $(SHARED_FILES)
	cargo build --manifest-path $(SERVER_FOLDER)/Cargo.toml --bin $(SERVER_BINARY) --release
$(SERVER_FOLDER)/target/release/civil_stat_collector: $(SERVER_FILES)
	cargo build --manifest-path $(SERVER_FOLDER)/Cargo.toml --bin civil_stat_collector --release

$(CLIENT_FOLDER)/www/index.js: $(CLIENT_FILES)
	./$(CLIENT_FOLDER)/node_modules/esbuild/bin/esbuild ./$(CLIENT_FOLDER)/src/index.tsx --sourcemap --bundle --external:fonts --outdir=./$(CLIENT_FOLDER)/www

$(WWW_FOLDER)/$(CLIENT_WASM_BG): $(WASM_FILES) $(SHARED_FILES)
	cargo build --manifest-path $(WASM_FOLDER)/Cargo.toml --target wasm32-unknown-unknown
	wasm-bindgen $(WASM_FOLDER)/target/wasm32-unknown-unknown/debug/$(CLIENT_WASM) --out-dir $(WWW_FOLDER) --no-modules

staging/www/$(CLIENT_WASM_BG): $(WASM_FILES) $(SHARED_FILES)
	mkdir -p $(@D)
	cargo build --manifest-path $(WASM_FOLDER)/Cargo.toml --release --target wasm32-unknown-unknown
	wasm-bindgen $(WASM_FOLDER)/target/wasm32-unknown-unknown/release/$(CLIENT_WASM) --out-dir staging/www --no-modules

staging/www/index.html: $(CLIENT_FOLDER)/www/index.js
	mkdir -p $(@D)
	cp -r $(WWW_FOLDER) staging/.
ifdef MINIFY
	minify -o staging/www/ --match=\.css $(WWW_FOLDER)
#	minify -r -o staging/www/js --match=\.js $(WWW_FOLDER)/js
endif
	sed -i 's/^var devMode.*/\/\/ START OF CODE MODIFIED BY MAKEFILE\nvar devMode = false;/g' staging/www/service-worker.js
	sed -i "s/^var CACHE_NAME.*/var CACHE_NAME = 'civil-$$(date '+%Y%m%d-%H%M')';\n\/\/ END OF CODE MODIFIED BY MAKEFILE/g" staging/www/service-worker.js

staging/$(SERVER_BINARY): server-release
	mkdir -p $(@D)
	cp $(SERVER_FOLDER)/target/release/$(SERVER_BINARY) staging/.
	cp $(SERVER_FOLDER)/target/release/civil_stat_collector staging/.
	cp .env.example staging/.

staging/systemd/isg-civil.sh: $(SYSTEMD_FILES)
	mkdir -p $(@D)
	cp -r misc/systemd staging/.

################################################################################
# top-level public targets
################################################################################

.PHONY: run download-images download-db clean-staging run-note_parser run-note_linked_list run-note_prev typescript-watch typescript-typecheck typescript-format deps

# copied from https://rosszurowski.com/log/2022/makefiles#self-documenting-makefiles
#
help: ## show this help

	@printf "one time initialisation:\n\n"
	@printf " make deps\n\n"
	@printf "run locally:\n\n"
	@printf " make run\n\n"
	@printf "during development also run 'make typescript-watch' alongside 'make run' to enable automatic typescript compilation\n\n"
	@printf "public make commands:\n\n"
	@grep -E '^[0-9a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[0;32m%-17s\033[m %s\n", $$1, $$2}'
	@printf "\n"

# based on https://github.com/stripe/stripe-cli/blob/master/Makefile
#
todo: ## show to-do items per file
	@grep \
		--color=always \
		-nRo -P '(?<=todo:).*' client/src | \
		awk -F: '{printf "%-36s %-31s %s\n", $$1, $$2, $$3}'
	@grep \
		--color=always \
		-nRo -P '(?<=todo:).*' server/src | \
		awk -F: '{printf "%-36s %-31s %s\n", $$1, $$2, $$3}'

deps:
	cd client; yarn install

typescript-watch: ## rebuild client code on code change
	while true; do inotifywait -e close_write --quiet --recursive ./$(CLIENT_FOLDER)/src; make typescript-build-and-typecheck; done

typescript-build-and-typecheck: $(CLIENT_FOLDER)/www/index.js typescript-typecheck

typescript-typecheck:
	./$(CLIENT_FOLDER)/node_modules/typescript/bin/tsc -p ./$(CLIENT_FOLDER)/tsconfig.json --noEmit

typescript-format: ## format the typescript code
	cd client; yarn prettier --write src

run: $(CLIENT_FOLDER)/www/index.js $(WWW_FOLDER)/$(CLIENT_WASM_BG) server ## build debug server and run
	cargo run --manifest-path $(SERVER_FOLDER)/Cargo.toml --bin $(SERVER_BINARY)


wasm: $(WWW_FOLDER)/$(CLIENT_WASM_BG)

# collect stats on each user's content, stores the stats in the db
# this is run periodically on the server
#
run-stat-collector: $(SERVER_FOLDER)/target/debug/civil_stat_collector
	cargo run --manifest-path $(SERVER_FOLDER)/Cargo.toml --bin civil_stat_collector

# iterates through all the notes in the database, parsing their markup
# useful as a sanity check to make sure everything is still parseable
#
run-note-parser:
	cargo run --manifest-path $(SERVER_FOLDER)/Cargo.toml --bin civil_note_parser

server: $(SERVER_FOLDER)/target/debug/$(SERVER_BINARY)
server-release: $(SERVER_FOLDER)/target/release/$(SERVER_BINARY) $(SERVER_FOLDER)/target/release/civil_stat_collector

staging: clean-staging staging/www/index.html staging/$(SERVER_BINARY) staging/systemd/isg-civil.sh staging/www/$(CLIENT_WASM_BG)

upload: staging ## upload the client and server onto indy.io
	rsync -avzhe ssh staging/. indy@indy.io:/home/indy/work/civil

upload-client: staging ## upload just the client onto indy.io
	rsync -avzhe ssh staging/www/. indy@indy.io:/home/indy/work/civil/www

clean-staging:
	rm -rf staging

download-images: ## download images to local machine from indy.io
	rsync -avzhe ssh indy@indy.io:/home/indy/work/civil/user-content .

download-db: ## download sqlite db to local machine from indy.io
	rm -f civil.db
	rm -f civil.db-shm
	rm -f civil.db-wal
	scp indy.io:work/civil/civil.db* .
