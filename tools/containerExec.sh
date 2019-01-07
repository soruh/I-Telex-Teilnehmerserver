#!/bin/bash

#check if docker is installed
DOCKER_PATH=`which docker`
if [ $? -eq 1 ]
then
	echo "please install docker"
	exit 1
fi


docker exec teilnehmerserver $@