const assert = require("assert");
const stream = require("stream");
const splitFileStream = require(".");

let readStream = new stream.PassThrough();
readStream.end("abcde");

splitFileStream.split(readStream, 1, __dirname + "/ff", (fileNames) => {
	assert.equal(5, fileNames.length);
	splitFileStream.mergeFiles(fileNames, "ff.fullfile", () => {
		console.log("Merge file function finished");
	});
});
