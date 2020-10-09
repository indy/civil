#!/bin/sh

now=`date +"%Y%m%d"`
pg_dump civil > /home/indy/bdrive/civil/civil_${now}.psql

cd /home/indy/work/civil
tar -cf user-content-${now}.tar.gz user-content
mv user-content-${now}.tar.gz /home/indy/bdrive/civil/.
