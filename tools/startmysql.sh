#!/bin/sh

# get project directory
dir="`pwd`/`dirname "$0"`/.."

exec docker run \
	-e MYSQL_RANDOM_ROOT_PASSWORD=true \
	-e MYSQL_USER=telefonbuch \
	-e MYSQL_PASSWORD=xNig4esW \
	-e MYSQL_DATABASE=telefonbuch \
	--mount type=bind,source=$dir/tables.sql,target=/docker-entrypoint-initdb.d/tables.sql \
	-p 3306:3306 \
	-d \
	--restart always \
	--name mysql \
	mysql:5.7 # upgrade to mysql 8 when the mysql module supports it
