# split-file-stream

Partition your readable streams into multiple files.

## Installation
```sh
npm install --save split-file-stream
```

## Usage
```javascript
var splitFileStream = require("split-file-stream");

splitFileStream.split(readStream, fileSize, outputPaths, (fileNames) => {
	console.log("This is an array of my new files:" fileNames);
});
```