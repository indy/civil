#!/bin/sh

now=`date +"%Y%m%d"`
pg_dump civil > /home/indy/db-bak/civil_${now}.psql
