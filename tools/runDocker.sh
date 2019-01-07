#!/bin/bash

#check if docker is installed
DOCKER_PATH=`which docker`
if [ $? -eq 1 ]
then
	echo "please install docker"
fi

# go to project directory
dir="`pwd`/`dirname "$0"`/.."

if [[ $1 == "-d" ]]
then
	echo "detatching"
	docker run \
		--mount type=bind,source=$dir/db,target=/app/db \
		--mount type=bind,source=$dir/logs,target=/app/logs \
		--name teilnehmerserver \
		--restart always \
		-d \
		teilnehmerserver
else
	echo "not detatching"
	docker run \
		--mount type=bind,source=$dir/db,target=/app/db \
		--mount type=bind,source=$dir/logs,target=/app/logs \
		--name teilnehmerserver \
		--rm \
		teilnehmerserver
fi

if [ $? -eq 125 ]
then
	echo
	echo "the container is probably already be running (see above)"
	exit 125
fi