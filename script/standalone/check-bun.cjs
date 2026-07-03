#!/usr/bin/env node
const path = require("node:path")
const semver = require("semver")
const root = path.resolve(__dirname, "../..")
const pkg = require(path.join(root, "package.json"))
const required = pkg.packageManager.split("@")[1]
const actual = process.argv[2]
if (!actual) process.exit(1)
process.exit(semver.satisfies(actual, `^${required}`) ? 0 : 1)
