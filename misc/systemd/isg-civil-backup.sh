#!/bin/sh

now=`date +"%Y%m%d"`

# Do not use `cp` to back up SQLite databases. It is not transactionally safe.
sqlite3 /home/indy/work/civil/civil.db '.backup /home/indy/bdrive/civil/civil.db'

tar -Jcf /home/indy/bdrive/civil/civil_${now}.tar.xz -C /home/indy/bdrive/civil civil.db
rm /home/indy/bdrive/civil/civil.db

cd /home/indy/work/civil
tar -Jcf user-content-${now}.tar.xz user-content
mv user-content-${now}.tar.xz /home/indy/bdrive/civil/.
