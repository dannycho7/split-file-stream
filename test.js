const assert = require("assert");
const stream = require("stream");
const splitFileStream = require(".");

let readStream = new stream.PassThrough();
readStream.end(new Buffer(5));

splitFileStream.split(readStream, 2, "filenameblahblablaflaska", (fileNames) => {
	assert.equal(3, fileNames.length);
});