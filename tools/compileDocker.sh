#!/bin/sh

# go to project directory
dir="`pwd`/`dirname "$0"`"
cd $dir;
cd '..';


echo -n "rebuilding Dockerfile..."
node tools/buildDockerfile.js
echo "done"

docker build . --tag=teilnehmerserver

echo "finished compiling Docker image"