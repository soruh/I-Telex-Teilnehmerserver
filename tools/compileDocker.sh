#!/bin/bash

#check if docker is installed
`which docker`>/dev/null
if [ $? -eq 1 ]
then
	echo "please install docker"
	exit 1
fi

# go to project directory
dir="`pwd`/`dirname "$0"`"
cd $dir;
cd '..';

`which node`>/dev/null
if [ $? -eq 0 ]
then
    echo -n "rebuilding Dockerfile..."
    node tools/buildDockerfile.js
    echo "done"
else
    echo please install node if you want to rebuild the Dockerfile
fi

docker build . --tag=teilnehmerserver

echo "finished compiling Docker image"