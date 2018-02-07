# split-file-stream

Partition your readable streams into multiple files.

You should use this module if:
* You have a readable stream and want to save to multiple files
	* Other solutions require you to supply a path as the source. This means you'd have to write your readable stream first, before partitioning the data.

## Installation
```sh
npm install --save split-file-stream
```

## Usage
To split a read stream into multiple files:
```javascript
var splitFileStream = require("split-file-stream");
let fileSize = 1024; // 1024 bytes per file
let outputPaths = __dirname + "/outputFiles" // file path partition's prefix

splitFileStream.split(readStream, fileSize, outputPaths, (fileNames) => {
	console.log("This is an array of my new files:" fileNames);
});
```
To merge a set of files together into one file:
```javascript
var splitFileStream = require("split-file-stream");
let fileNames = fileNames; // take this fileNames array from the output of the split method
let outputPath = __dirname + "/outputFile" // path of the merged file

splitFileStream.mergeFiles(fileNames, outputPath, () => {
	console.log("Finished merging files")
});
```