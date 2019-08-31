# split-file-stream
[![npm version](https://badge.fury.io/js/split-file-stream.svg)](https://badge.fury.io/js/split-file-stream)

Partition your readable streams into multiple files or combine files into one merged readable stream.

### You should use this module if:
* You have a readable stream and want to save to multiple files
	* Other solutions require you to supply a path as the source.
		* This means you'd have to write your readable stream first, before partitioning the data.
	* Faster solution as disk writes are slow
* Vice Versa: You want to pipe the merge output as a stream
	* Pipe the merge output to the response of a web request
	* Pipe encrypted partitioned files merge output to a decryption stream

## Installation
```sh
npm install --save split-file-stream
```

## Usage
To split a read stream into multiple files:
```javascript
var splitFileStream = require("split-file-stream");
let maxFileSize = 1024; // 1024 bytes per file
let outputPath = __dirname + "/outputFiles"; // file path partition's prefix

splitFileStream.split(readStream, maxFileSize, outputPath, (filePaths) => {
	console.log("This is an array of my new files:", filePaths);
	/* stream will be saved to files in the path ∈ { ./outputFiles.split-x | x ∈ N } */
});
```

To merge a set of files together into one output stream:
```javascript
var splitFileStream = require("split-file-stream");
let filePaths = filePaths; // take this filePaths array from the output of the split method

splitFileStream.mergeFilesToStream(filePaths, (outStream) => {
	outStream.on("data", (chunk) => {
		console.log(`Received chunk of ${chunk.length} bytes`);
	});

	outStream.on("end", () => {
		console.log("Out stream closed. All files have been merged")
	});
});
```

To merge a set of files to write to disk:
```javascript
// Note: You can also do this with the mergeFilesToStream method and piping the stream to a fs writeStream.
var splitFileStream = require("split-file-stream");
let filePaths = filePaths; // take this filePaths array from the output of the split method
let outputPath = __dirname + "/outputFile";

splitFileStream.mergeFilesToDisk(filePaths, outputPath, () => {
    console.log("Finished merging files");
});
```

Example usage of the mergeFilesToDisk method using the mergeFilesToStream method:
```javascript
var fs = require("fs");
var splitFileStream = require("split-file-stream");
let filePaths = filePaths; // take this filePaths array from the output of the split method
let outputPath = __dirname + "/outputFile";

splitFileStream.mergeFilesToStream(filePaths, (outStream) => {
	let writeStream = fs.createWriteStream(outputPath);
	outStream.pipe(writeStream);
});
```

To split a read stream with a custom function that determines the file name:
```javascript
var splitFileStream = require("split-file-stream");
let maxFileSize = 1024; // 1024 bytes per file
let outputPath = __dirname + "/outputFiles"; // file path partition's prefix
var customSplit = splitFileStream.getSplitWithGenFilePath((n) => `${outputPath}-${(n + 1)}`)

customSplit(readStream, maxFileSize, (filePaths) => {
	console.log("This is an array of my new files:", filePaths);
});
```

Alternatively, if you'd like a lower level API for splitting a stream, you can use `_splitToStream`. This function will split your readable stream into multiple streams. This function is what is used to implement the split function.
```javascript
var stream = require("stream");
var splitFileStream = require("split-file-stream");
let partitionStreamSize = 1024; // 1024 bytes per partition
const outStreamCreate = (partitionNum) => {
	return stream.passThrough();
};

splitFileStream._splitToStream(outStreamCreate, readStream, partitionStreamSize, (outStreams) => {
	console.log("This is an array of the created output streams:", outStreams);
});
```
