#!/bin/sh

now=`date +"%Y%m%d"`
pg_dump civil > /home/indy/bdrive/civil/civil_${now}.psql
