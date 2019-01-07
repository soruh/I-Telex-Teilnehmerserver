#!/bin/bash

#check if docker is installed
DOCKER_PATH=`which docker`
if [ $? -eq 1 ]
then
	echo "please install docker"
fi

# go to project directory
dir="`pwd`/`dirname "$0"`/.."
cd $dir;


tools/compileDocker.sh
echo
echo "running docker image..."
tools/runDocker.sh -d