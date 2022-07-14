import * as fs from "fs";
import V8Snapshot from './V8/V8Snapshot';

const text = fs.readFileSync("xxx").toString();
const v8 = new V8Snapshot({text});
console.log(v8.calculateStatistics())
