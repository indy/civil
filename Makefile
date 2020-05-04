# Make doesn't come with a recursive wildcard function so we have to use this:
#
rwildcard=$(foreach d,$(wildcard $(1:=/*)),$(call rwildcard,$d,$2) $(filter $(subst *,%,$2),$d))

########################################
#
# 	Upload release builds to server:
#
# 	$ make upload
#
########################################

prod: client-dist server-dist systemd-dist

upload: prod
	rsync -avzhe ssh dist/. indy@indy.io:/home/indy/work/civil

CLIENT_FILES = $(call rwildcard,client/public,*) $(call rwildcard,client/src,*)
SERVER_FILES = $(call rwildcard,server/src,*) $(wildcard server/errors/*.html) server/Cargo.toml
SYSTEMD_FILES = $(wildcard misc/systemd/*)

client-dist: dist/www/index.html
server-dist: dist/civil_server
systemd-dist: dist/systemd/isg-civil.sh

dist/www/index.html: $(CLIENT_FILES)
	cd client && npm run build

dist/civil_server: $(SERVER_FILES)
	cd server && cargo build --release
	cp server/target/release/civil_server dist/.
	cp server/.env.example dist/.
	cp -r server/errors dist/.

dist/systemd/isg-civil.sh: $(SYSTEMD_FILES)
	cp -r misc/systemd dist/.
