########################################
#
#   BUILDING
#
# 	Build debug server and run
# 	$ make run
#
# 	Build release versions in staging directory
# 	$ make staging
#
# 	(only run this on Peru)
# 	$ make peru-publish
#
#   HELP DURING DEVELOPMENT
#
# 	Download images from the server:
# 	$ make download-images
#
########################################

################################################################################
# utils
################################################################################

# Make doesn't come with a recursive wildcard function so we have to use this:
#
rwildcard=$(foreach d,$(wildcard $(1:=/*)),$(call rwildcard,$d,$2) $(filter $(subst *,%,$2),$d))

# check if minify is installed
MINIFY := $(shell command -v minify 2> /dev/null)

# note: usage of mkdir -p $(@D)
# $(@D), means "the directory the current target resides in"
# using it to make sure that a staging directory is created

################################################################################
# filesets
################################################################################

CLIENT_FILES = $(call rwildcard,www,*)
SERVER_FILES = $(call rwildcard,civil-server/src,*) $(wildcard civil-server/errors/*.html) civil-server/Cargo.toml
SYSTEMD_FILES = $(wildcard misc/systemd/*)

WASM_FILES = $(wildcard civil-wasm/src/*) civil-wasm/Cargo.toml
SHARED_FILES = $(wildcard civil-shared/src/*) civil-shared/Cargo.toml

.PHONY: run download-images clean-staging

################################################################################
# top-level public targets
################################################################################

run: www/civil_wasm_bg.wasm server
	cargo run --manifest-path civil-server/Cargo.toml --bin civil_server

# collect stats on each user's content, stores the stats in the db
# this is run periodically on the server
#
run-stat-collector: civil-server/target/debug/civil_stat_collector
	cargo run --manifest-path civil-server/Cargo.toml --bin civil_stat_collector

# iterates through all the notes in the database, parsing their markup
# useful as a sanity check to make sure everything is still parseable
#
run-note_parser: civil-server/target/debug/civil_note_parser
	cargo run --manifest-path civil-server/Cargo.toml --bin civil_note_parser

server: civil-server/target/debug/civil_server
server-release: civil-server/target/release/civil_server civil-server/target/release/civil_stat_collector

staging: clean-staging staging/www/index.html staging/civil_server staging/systemd/isg-civil.sh staging/www/civil_wasm_bg.wasm

# only run this on the server
peru-publish: staging
	mkdir -p ~/work/civil
	rsync -avzh staging/. ~/work/civil

clean-staging:
	rm -rf staging

download-images:
	rsync -avzhe ssh indy@indy.io:/home/indy/work/civil/user-content .

################################################################################
# targets
################################################################################

civil-server/target/debug/civil_server: $(SERVER_FILES) $(SHARED_FILES)
	cargo build --manifest-path civil-server/Cargo.toml --bin civil_server
civil-server/target/debug/civil_stat_collector: $(SERVER_FILES)
	cargo build --manifest-path civil-server/Cargo.toml --bin civil_stat_collector

civil-server/target/release/civil_server: $(SERVER_FILES) $(SHARED_FILES)
	cargo build --manifest-path civil-server/Cargo.toml --bin civil_server --release
civil-server/target/release/civil_stat_collector: $(SERVER_FILES)
	cargo build --manifest-path civil-server/Cargo.toml --bin civil_stat_collector --release

www/civil_wasm_bg.wasm: $(WASM_FILES) $(SHARED_FILES)
	cargo build --manifest-path civil-wasm/Cargo.toml --target wasm32-unknown-unknown
	wasm-bindgen civil-wasm/target/wasm32-unknown-unknown/debug/civil_wasm.wasm --out-dir www --no-typescript --no-modules

staging/www/civil_wasm_bg.wasm: $(WASM_FILES) $(SHARED_FILES)
	mkdir -p $(@D)
	cargo build --manifest-path civil-wasm/Cargo.toml --release --target wasm32-unknown-unknown
	wasm-bindgen civil-wasm/target/wasm32-unknown-unknown/release/civil_wasm.wasm --out-dir staging/www --no-typescript --no-modules

staging/www/index.html: $(CLIENT_FILES)
	mkdir -p $(@D)
	cp -r www staging/.
ifdef MINIFY
	minify -o staging/www/ --match=\.css www
	minify -r -o staging/www/js --match=\.js www/js
endif
	sed -i 's/^var devMode.*/\/\/ START OF CODE MODIFIED BY MAKEFILE\nvar devMode = false;/g' staging/www/service-worker.js
	sed -i "s/^var CACHE_NAME.*/var CACHE_NAME = 'civil-$$(date '+%Y%m%d-%H%M')';\n\/\/ END OF CODE MODIFIED BY MAKEFILE/g" staging/www/service-worker.js

staging/civil_server: server-release
	mkdir -p $(@D)
	cp civil-server/target/release/civil_server staging/.
	cp civil-server/target/release/civil_stat_collector staging/.
	cp .env.example staging/.
	cp -r civil-server/errors staging/.

staging/systemd/isg-civil.sh: $(SYSTEMD_FILES)
	mkdir -p $(@D)
	cp -r misc/systemd staging/.
