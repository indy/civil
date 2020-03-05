#!/bin/sh

if [ "$1" = "install" ]
then
    docker-compose -f docker-compose.builder.yml run --rm install
else
    docker-compose up
fi
