#!/usr/bin/env node

const path = require('path')
const fs = require('fs')
const TEST_RE = /^test_[\w-]+\.json$/

const files = fs.readdirSync(path.join(__dirname, 'data'))
  .filter((file) => {
    return file.match(TEST_RE)
  })

console.log(`Removing ${files.length} test databases`)

for (const file of files) {
  fs.unlinkSync(path.join(__dirname, 'data', file))
}

console.log('Done!')
