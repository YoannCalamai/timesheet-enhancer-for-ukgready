#!/bin/bash

d=$(date +%Y.%-m.%-d)
version="$d.1"

cd dist
mkdir temp
cd temp

echo "Creating internal extension chrome package"
cp -r ../../src/* .
mv -f manifest-internal.json manifest.json
zip -r ../release-internal-$version.zip .

echo "Creating public extension chrome package"
cp -f ../../src/manifest.json manifest.json
rm readme.txt
zip -r ../release-$version.zip .

cd ..
rm -rf temp