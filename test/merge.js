const assert = require("assert");
const fs = require("fs");
const stream = require("stream");
const splitFileStream = require("..");

describe("#mergeFilesToDisk", () => {
	it("Should merge 2 1mb partitions into one file", (done) => {
		let readStream = new stream.PassThrough();
		readStream.end(new Buffer.alloc(1024 * 1024 * 2));

		splitFileStream.split(readStream, 1024 * 1024 * 1, __dirname + "/output/ff", (filePaths) => {
			assert.equal(2, filePaths.length);
			let mergeFilePath = __dirname + "/output/ff.fullfile";
			splitFileStream.mergeFilesToDisk(filePaths, mergeFilePath, () => {
				fs.stat(mergeFilePath, (err, stats) => {
					assert.equal(1024 * 1024 * 2, stats.size);
					return done();
				});
			});
		});
	});
});

describe("#mergeFilesToStream", () => {
	it("Should merge 2 1mb partitions into one file stream", (done) => {
		let readStream = new stream.PassThrough();
		readStream.end(new Buffer.alloc(1024 * 1024 * 2));

		splitFileStream.split(readStream, 1024 * 1024 * 1, __dirname + "/output/ff", (filePaths) => {
			assert.equal(2, filePaths.length);
			let mergeFilePath = __dirname + "/output/ff.fullfile";
			splitFileStream.mergeFilesToStream(filePaths, (stream) => {
				let dataLength = 0;
				stream.on("data", (chunk) => {
					dataLength += chunk.length;
				});

				stream.on("finish", () => {
					assert.equal(dataLength, 1024 * 1024 * 2);
					return done();
				});
			});
		});
	});
});