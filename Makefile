# Make doesn't come with a recursive wildcard function so we have to use this:
#
rwildcard=$(foreach d,$(wildcard $(1:=/*)),$(call rwildcard,$d,$2) $(filter $(subst *,%,$2),$d))

# check if minify is installed
MINIFY := $(shell command -v minify 2> /dev/null)

# note: usage of mkdir -p $(@D)
# $(@D), means "the directory the current target resides in"
# using it to make sure that a dist directory is created

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

download-images:
	rsync -avzhe ssh indy@indy.io:/home/indy/work/civil/user-content .

clean-dist:
	rm -rf dist

wasm: www/wasm_bg.wasm

release: clean-dist client-dist server-dist systemd-dist wasm-dist

upload: release
	rsync -avzhe ssh dist/. indy@indy.io:/home/indy/work/civil

CLIENT_FILES = $(call rwildcard,www,*)
SERVER_FILES = $(call rwildcard,server/src,*) $(wildcard server/errors/*.html) server/Cargo.toml
SYSTEMD_FILES = $(wildcard misc/systemd/*)

WASM_FILES = $(wildcard wasm/src/*) wasm/Cargo.toml
CORE_FILES = $(wildcard core/src/*) core/Cargo.toml

# run the server
run:
	cargo run --manifest-path server/Cargo.toml

wasm-dist: dist/www/wasm_bg.wasm
client-dist: dist/www/index.html
server-dist: dist/civil_server
systemd-dist: dist/systemd/isg-civil.sh

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

dist/civil_server: $(SERVER_FILES)
	mkdir -p $(@D)
	cd server && cargo build --release
	cp server/target/release/civil_server dist/.
	cp server/.env.example dist/.
	cp -r server/errors dist/.

dist/systemd/isg-civil.sh: $(SYSTEMD_FILES)
	mkdir -p $(@D)
	cp -r misc/systemd dist/.
