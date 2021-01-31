########################################
#
#   BUILDING
#
# 	Build debug server and run
# 	$ make run
#
# 	Build debug build of wasm file
# 	$ make wasm
#
# 	Build release builds of everything
# 	$ make release
#
#   DEPLOYING
#
# 	Upload release builds to server:
# 	$ make upload
#
#   HELP DURING DEVELOPMENT
#
# 	Download images from the server:
# 	$ make download-images
#
########################################

.PHONY: run download-images clean-dist

run:
	cargo run --manifest-path server/Cargo.toml --bin civil_server

run-stat-collector:
	cargo run --manifest-path server/Cargo.toml --bin civil_stat_collector

wasm: www/wasm_bg.wasm

release: clean-dist client-dist server-dist systemd-dist wasm-dist

clean-dist:
	rm -rf dist

upload: release
	rsync -avzhe ssh dist/. indy@indy.io:/home/indy/work/civil

download-images:
	rsync -avzhe ssh indy@indy.io:/home/indy/work/civil/user-content .

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
# using it to make sure that a dist directory is created

################################################################################
# filesets
################################################################################

CLIENT_FILES = $(call rwildcard,www,*)
SERVER_FILES = $(call rwildcard,server/src,*) $(wildcard server/errors/*.html) server/Cargo.toml
SYSTEMD_FILES = $(wildcard misc/systemd/*)

WASM_FILES = $(wildcard wasm/src/*) wasm/Cargo.toml
CORE_FILES = $(wildcard core/src/*) core/Cargo.toml

################################################################################
# convenient aliases for targets
################################################################################

wasm-dist: dist/www/wasm_bg.wasm
client-dist: dist/www/index.html
server-dist: dist/civil_server
systemd-dist: dist/systemd/isg-civil.sh

################################################################################
# targets
################################################################################

www/wasm_bg.wasm: $(WASM_FILES) $(CORE_FILES)
	cargo build --manifest-path wasm/Cargo.toml --target wasm32-unknown-unknown
	wasm-bindgen wasm/target/wasm32-unknown-unknown/debug/wasm.wasm --out-dir www --no-typescript --no-modules

dist/www/wasm_bg.wasm: $(WASM_FILES) $(CORE_FILES)
	mkdir -p $(@D)
	cargo build --manifest-path wasm/Cargo.toml --release --target wasm32-unknown-unknown
	wasm-bindgen wasm/target/wasm32-unknown-unknown/release/wasm.wasm --out-dir dist/www --no-typescript --no-modules

dist/www/index.html: $(CLIENT_FILES)
	mkdir -p $(@D)
	cp -r www dist/.
ifdef MINIFY
	minify -o dist/www/ --match=\.css www
	minify -r -o dist/www/js --match=\.js www/js
endif
	sed -i 's/^var devMode.*/\/\/ START OF CODE MODIFIED BY MAKEFILE\nvar devMode = false;/g' dist/www/service-worker.js
	sed -i "s/^var CACHE_NAME.*/var CACHE_NAME = 'civil-$$(date '+%Y%m%d-%H%M')';\n\/\/ END OF CODE MODIFIED BY MAKEFILE/g" dist/www/service-worker.js

dist/civil_server: $(SERVER_FILES)
	mkdir -p $(@D)
	cd server && cargo build --release
	cp server/target/release/civil_server dist/.
	cp server/target/release/civil_stat_collector dist/.
	cp .env.example dist/.
	cp -r server/errors dist/.

dist/systemd/isg-civil.sh: $(SYSTEMD_FILES)
	mkdir -p $(@D)
	cp -r misc/systemd dist/.
