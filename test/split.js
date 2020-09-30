const assert = require("assert");
const { AssertionError } = assert;
const fs = require("fs");
const stream = require("stream");
const splitFileStream = require("..");

describe("#split", () => {
	it("should throw on maxFileSize <= 0", (done) => {
		let readStream = new stream.PassThrough();
		readStream.end("abcde");

		let brokenSplitCall = () =>
			splitFileStream.split(readStream, 0, __dirname + "/output/ff", () => {});

		assert.throws(brokenSplitCall, RangeError);
		return done();
	});

	it("should create 5 partitions for a 5 word string of 1 byte partitions", (done) => {
		let readStream = new stream.PassThrough();
		readStream.end("abcde");

		splitFileStream.split(readStream, 1, __dirname + "/output/ff", (filePaths) => {
			assert.strictEqual(5, filePaths.length);
			return done();
		});
	});

	it("should create 2 partitions for 100mb file of 50mb chunks", (done) => {
		let readStream = new stream.PassThrough();
		readStream.end(new Buffer.alloc(1024 * 1024 * 100));

		splitFileStream.split(readStream, 1024 * 1024 * 50, __dirname + "/output/ff", (filePaths) => {
			assert.strictEqual(2, filePaths.length);
			return done();
		});
	});

	it("should create partitions that retain the same data", (done) => {
		let readStream = new stream.PassThrough(), inStreamContents = "CORRECT";
		readStream.end(inStreamContents);

		splitFileStream.split(readStream, 1, __dirname + "/output/ff", (filePaths) => {
			let concatString = "";
			filePaths.forEach((filePath) => {
				let fileContent = fs.readFileSync(filePath);
				concatString += fileContent;
			});

			assert.strictEqual(concatString, inStreamContents);
			return done();
		});
	});

	it("should create partitions using custom generateFilePath", (done) => {
		let readStream = new stream.PassThrough(), inStreamContents = "CORRECT";
		readStream.end(inStreamContents);

		let outputPath = __dirname + "/output/ff"; // file path partition's prefix
		let expectedFilePaths = Array.apply(null, Array(7)).map((v, i) => `${outputPath}-${i + 1}`);
		var customSplit = splitFileStream.getSplitWithGenFilePath((n) => `${outputPath}-${(n + 1)}`)

		customSplit(readStream, 1, (filePaths) => {
			assert.strictEqual(filePaths.length, 7);
			assert.deepStrictEqual(filePaths, expectedFilePaths);

			let concatString = "";
			filePaths.forEach((filePath) => {
				let fileContent = fs.readFileSync(filePath);
				concatString += fileContent;
			});

			assert.strictEqual(concatString, inStreamContents);
			return done();
		});
	});
});
