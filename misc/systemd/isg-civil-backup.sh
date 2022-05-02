#!/bin/sh

now=`date +"%Y%m%d"`
pg_dump civil > /home/indy/bdrive/civil/civil_${now}.psql
tar -Jcf /home/indy/bdrive/civil/civil_${now}.tar.xz /home/indy/bdrive/civil/civil_${now}.psql
rm /home/indy/bdrive/civil/civil_${now}.psql

cd /home/indy/work/civil
tar -Jcf user-content-${now}.tar.xz user-content
mv user-content-${now}.tar.xz /home/indy/bdrive/civil/.
