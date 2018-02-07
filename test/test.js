const assert = require("assert");
const stream = require("stream");
const splitFileStream = require("..");

describe("splitFileStream", () => {
	describe("#split", () => {
		it("should create 5 partitions for a 5 word string of 1 byte partitions", (done) => {
			let readStream = new stream.PassThrough();
			readStream.end("abcde");

			splitFileStream.split(readStream, 1, __dirname + "/output/ff", (fileNames) => {
				assert.equal(5, fileNames.length);
				splitFileStream.mergeFiles(fileNames, __dirname + "/output/ff.fullfile", () => {
					return done();
				});
			});
		});

		it("should create 2 partitions for 100mb file of 50mb chunks", (done) => {
			let readStream = new stream.PassThrough();
			readStream.end(new Buffer(1024 * 1024 * 100));

			splitFileStream.split(readStream, 1024 * 1024 * 50, __dirname + "/output/ff", (fileNames) => {
				assert.equal(2, fileNames.length);
				splitFileStream.mergeFiles(fileNames, __dirname + "/output/ff.fullfile", () => {
					return done();
				});
			});
		});
	});
});