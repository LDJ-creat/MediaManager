#!/usr/bin/env node
import { dispatch } from "./dispatch.js";

const argv = process.argv.slice(2);
dispatch(argv)
  .then((code) => process.exit(code))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
