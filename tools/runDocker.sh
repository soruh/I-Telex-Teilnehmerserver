#!/bin/bash

#check if docker is installed
which docker>/dev/null
if [ $? -eq 1 ]
then
	echo "please install docker"
	exit 1
fi

# go to project directory
dir="`pwd`/`dirname "$0"`/.."


mkdir logs 2>/dev/null
mkdir db 2>/dev/null


function runContainer {
	exec docker run \
		--mount type=bind,source=$dir/db,target=/app/db \
		--mount type=bind,source=$dir/logs,target=/app/logs \
		--mount type=bind,source=$dir/config,target=/app/config \
		--mount type=bind,source=$dir/cert,target=/app/cert \
		--name teilnehmerserver \
		`cat $dir/tools/exposed_ports` \
		$@ \
		soruh/teilnehmerserver
}

if [[ $1 == "-d" ]]
then
	echo "detatching"
	runContainer -d --restart always	
else
	echo "not detatching"
	runContainer --rm
fi

if [ $? -eq 125 ]
then
	echo
	echo "the container is probably already be running (see above)"
	exit 125
fi