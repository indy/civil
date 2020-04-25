# make : updates local prod/dist folder with distributable version of civil
#
# make upload : upload civil to linode

all: client server systemd
.PHONY: all

# Make doesn't come with a recursive wildcard function so we have to use this
# complicated thing which was copy/pasted from StackOverflow.
# Fucking hell, why isn't there a built-in function to recursively traverse
# a directory and select files that match a wildcard?
#
# https://stackoverflow.com/questions/2483182/recursive-wildcards-in-gnu-make/18258352#18258352
#
rwildcard=$(foreach d,$(wildcard $(1:=/*)),$(call rwildcard,$d,$2) $(filter $(subst *,%,$2),$d))

CLIENT_FILES = $(call rwildcard,../client/public,*) $(call rwildcard,../client/src,*)
SERVER_FILES = $(call rwildcard,../server/src,*) $(call rwildcard,../server/errors,*) ../server/Cargo.toml
SYSTEMD_FILES = systemd/isg-civil.service systemd/isg-start-civil.sh

client: dist/www/index.html
server: dist/civil_server
systemd: dist/systemd/isg-start-civil.sh

dist/www/index.html: $(CLIENT_FILES)
	cd ../client && npm run build

dist/civil_server: $(SERVER_FILES)
	cd ../server && cargo build --release
	cp ../server/target/release/civil_server dist/.
	cp ../server/.env.example dist/.
	cp -r ../server/errors dist/.

dist/systemd/isg-start-civil.sh: $(SYSTEMD_FILES)
	cp -r systemd dist/.

upload:
	rsync -avzhe ssh dist/. indy@indy.io:/home/indy/work/civil
