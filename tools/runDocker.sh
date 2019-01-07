#!/bin/bash

#check if docker is installed
DOCKER_PATH=`which docker`
if [ $? -eq 1 ]
then
	echo "please install docker"
	exit 1
fi

# go to project directory
dir="`pwd`/`dirname "$0"`/.."


mkdir logs 2>/dev/null
mkdir db 2>/dev/null

if [[ $1 == "-d" ]]
then
	echo "detatching"
	exec docker run \
		--mount type=bind,source=$dir/db,target=/app/db \
		--mount type=bind,source=$dir/logs,target=/app/logs \
		--name teilnehmerserver \
		--restart always \
		-d \
		teilnehmerserver
else
	echo "not detatching"
	exec docker run \
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