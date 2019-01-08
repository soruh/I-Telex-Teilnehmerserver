#!/bin/bash

#check if docker is installed
which docker>/dev/null
if [ $? -eq 1 ]
then
	echo "please install docker"
	exit 1
fi


docker exec teilnehmerserver $@