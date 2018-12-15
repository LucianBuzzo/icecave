#!/bin/sh

set -e

TARBALL="$(npm pack)"
TEST_DIR="/tmp/test_$(openssl rand -base64 32)"
CURRENTDIR=$(pwd)

mkdir -p $TEST_DIR
cp $TARBALL $TEST_DIR
cd $TEST_DIR
mkdir icecave-data
npm i --production $TARBALL
cat <<EOF > index.js
const IceCave = require('icecave')
const db = new IceCave()
db.shutdown()
console.log('Smoke test complete')
EOF
node index.js

cd $CURRENTDIR

rm -rf $TEST_DIR
