#!/bin/sh

IMAGE_NAME='placepod-api'
VERSION='1'

docker build -t $IMAGE_NAME .
docker tag ${IMAGE_NAME}:latest ${IMAGE_NAME}:${VERSION}
