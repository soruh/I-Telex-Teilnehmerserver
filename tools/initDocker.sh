#!/bin/bash

#check if docker is installed
`which docker`>/dev/null
if [ $? -eq 1 ]
then
	echo "please install docker"
	exit 1
fi

# go to project directory
dir="`pwd`/`dirname "$0"`/.."
cd $dir;


tools/compileDocker.sh
echo
echo "running docker image..."
tools/runDocker.sh -d