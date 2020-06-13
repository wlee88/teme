#!/bin/bash

rm meme.zip
PACKAGE_VERSION=$(cat package.json \
  | grep version \
  | head -1 \
  | awk -F: '{ print $2 }' \
  | sed 's/[",]//g')
zip -r meme.zip . -x \*.git\x
aws s3 cp meme.zip s3://terraform-wlee-meme/v$PACKAGE_VERSION/meme.zip