const assert = require("assert");
const fs = require("fs");
const stream = require("stream");
const splitFileStream = require("..");

describe("splitFileStream", () => {
	describe("#split", () => {
		it("should create 5 partitions for a 5 word string of 1 byte partitions", (done) => {
			let readStream = new stream.PassThrough();
			readStream.end("abcde");

			splitFileStream.split(readStream, 1, __dirname + "/output/ff", (fileNames) => {
				assert.equal(5, fileNames.length);
				return done();
			});
		});

		it("should create 2 partitions for 100mb file of 50mb chunks", (done) => {
			let readStream = new stream.PassThrough();
			readStream.end(new Buffer(1024 * 1024 * 100));

			splitFileStream.split(readStream, 1024 * 1024 * 50, __dirname + "/output/ff", (fileNames) => {
				assert.equal(2, fileNames.length);
				return done();
			});
		});
	});

	describe("#mergeFilesToDisk", () => {
		it("Should merge 2 1mb partitions into one file", (done) => {
			let readStream = new stream.PassThrough();
			readStream.end(new Buffer(1024 * 1024 * 2));

			splitFileStream.split(readStream, 1024 * 1024 * 1, __dirname + "/output/ff", (fileNames) => {
				assert.equal(2, fileNames.length);
				let mergeFilePath = __dirname + "/output/ff.fullfile";
				splitFileStream.mergeFilesToDisk(fileNames, mergeFilePath, () => {
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
			readStream.end(new Buffer(1024 * 1024 * 2));

			splitFileStream.split(readStream, 1024 * 1024 * 1, __dirname + "/output/ff", (fileNames) => {
				assert.equal(2, fileNames.length);
				let mergeFilePath = __dirname + "/output/ff.fullfile";
				splitFileStream.mergeFilesToStream(fileNames, (stream) => {
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
});