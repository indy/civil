# Make doesn't come with a recursive wildcard function so we have to use this:
#
rwildcard=$(foreach d,$(wildcard $(1:=/*)),$(call rwildcard,$d,$2) $(filter $(subst *,%,$2),$d))

########################################
#
# 	Build debug build of wasm file
# 	$ make wasm
#
# 	Build release builds of everything
# 	$ make release
#
# 	Upload release builds to server:
# 	$ make upload
#
########################################

wasm: client/public/wasm_bg.wasm

release: client-dist server-dist systemd-dist wasm-dist

upload: release
	rsync -avzhe ssh dist/. indy@indy.io:/home/indy/work/civil

CLIENT_FILES = $(call rwildcard,client/public,*) $(call rwildcard,client/src,*)
SERVER_FILES = $(call rwildcard,server/src,*) $(wildcard server/errors/*.html) server/Cargo.toml
SYSTEMD_FILES = $(wildcard misc/systemd/*)

WASM_FILES = $(wildcard wasm/src/*) wasm/Cargo.toml
CORE_FILES = $(wildcard core/src/*) core/Cargo.toml

wasm-dist: dist/www/wasm_bg.wasm
client-dist: dist/www/index.html
server-dist: dist/civil_server
systemd-dist: dist/systemd/isg-civil.sh

client/public/wasm_bg.wasm: $(WASM_FILES) $(CORE_FILES)
	cargo build --manifest-path wasm/Cargo.toml --target wasm32-unknown-unknown
	wasm-bindgen wasm/target/wasm32-unknown-unknown/debug/wasm.wasm --out-dir client/public --no-typescript --no-modules

dist/www/wasm_bg.wasm: $(WASM_FILES) $(CORE_FILES)
	cargo build --manifest-path wasm/Cargo.toml --release --target wasm32-unknown-unknown
	wasm-bindgen wasm/target/wasm32-unknown-unknown/release/wasm.wasm --out-dir dist/www --no-typescript --no-modules

dist/www/index.html: $(CLIENT_FILES)
	cd client && npm run build

dist/civil_server: $(SERVER_FILES)
	cd server && cargo build --release
	cp server/target/release/civil_server dist/.
	cp server/.env.example dist/.
	cp -r server/errors dist/.

dist/systemd/isg-civil.sh: $(SYSTEMD_FILES)
	cp -r misc/systemd dist/.
