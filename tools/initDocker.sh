#!/bin/bash

#check if docker is installed
which docker>/dev/null


# go to project directory
dir="`pwd`/`dirname "$0"`/.."
cd $dir;


tools/compileDocker.sh
echo
echo "running docker image..."
tools/runDocker.sh -d