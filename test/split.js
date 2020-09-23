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

		splitFileStream.split(readStream, 1, __dirname + "/output/ff", (filePaths, err) => {
			assert.strictEqual(5, filePaths.length);
			return done();
		});
	});

	it("should create 2 partitions for 100mb file of 50mb chunks", (done) => {
		let readStream = new stream.PassThrough();
		readStream.end(new Buffer.alloc(1024 * 1024 * 100));

		splitFileStream.split(readStream, 1024 * 1024 * 50, __dirname + "/output/ff", (filePaths, err) => {
			assert.strictEqual(2, filePaths.length);
			return done();
		});
	});

	it("should create partitions that retain the same data", (done) => {
		let readStream = new stream.PassThrough(), inStreamContents = "CORRECT";
		readStream.end(inStreamContents);

		splitFileStream.split(readStream, 1, __dirname + "/output/ff", (filePaths, err) => {
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

		customSplit(readStream, 1, (filePaths, err) => {
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

	it("should support stringifying objectMode", (done) => {
		let readStream = new stream.Readable({
			objectMode: true,
			read() { }
		}).pipe(new stream.PassThrough({ objectMode: true }));
		readStream.push({ qr: 'st' }) // 1 object is 11 bytes (2 bytes per character, including { })
		readStream.push({ uv: 'wx' })
		readStream.push(null) // end readStream
		splitFileStream.split(readStream, 22, __dirname + "/output/ff", (filePaths, err) => {
			assert.strictEqual(1, filePaths.length);
			return done();
		});
	});

	it("should throw on objects larger than maxFileSize in stringifying objectMode", (done) => {
		let readStream = new stream.Readable({
			objectMode: true,
			read() { }
		}).pipe(new stream.PassThrough({ objectMode: true }));
		readStream.push({ ab: 'cd' }) // 11 bytes (2 bytes per character, including { })
		readStream.push({ ef: 'ghi' }) // 12 bytes (2 bytes per character, including { })
		readStream.push(null) // end readStream

		splitFileStream.split(readStream, 11, __dirname + "/output/ff", (filePaths, err) => {
			assert.strictEqual(2, filePaths.length);
			const {size: fileSize} = fs.statSync(filePaths[0]);
			assert.strictEqual(11, fileSize);
			const {size: fileSize2} = fs.statSync(filePaths[1]);
			assert.strictEqual(0, fileSize2);
			assert.notStrictEqual(err, null);
			var passErr = function(err) { throw err }
			assert.throws(function() { passErr(err) }, RangeError)
			done();
		})
	});

	it("should split for objects larger than maxFileSize in stringifying objectMode", (done) => {
		let readStream = new stream.Readable({
			objectMode: true,
			read() { }
		}).pipe(new stream.PassThrough({ objectMode: true }));
		readStream.push({ ab: 'cd' }) // 11 bytes (2 bytes per character, including { })
		readStream.push({ ef: 'ghi' }) // 12 bytes (2 bytes per character, including { })
		readStream.push(null) // end readStream

		splitFileStream.split(readStream, 22, __dirname + "/output/ff", (filePaths, err) => {
			assert.strictEqual(2, filePaths.length);
			const {size: fileSize} = fs.statSync(filePaths[0]);
			assert.strictEqual(11, fileSize);
			const {size: fileSize2} = fs.statSync(filePaths[1]);
			assert.strictEqual(12, fileSize2);
			assert.strictEqual(err, null);
			done();
		})
	});

	it("should respect maxFileSize in readable stream in objectMode with object size matching", (done) => {
		const myTransform = new stream.Transform({
			objectMode: true,
			transform(chunk, encoding, callback) {
				// Push the data onto the readable queue.
				callback(null, Object.keys(chunk) + Object.values(chunk)); // concatenate key+value
			}
		});

		const readStream = new stream.Readable({ objectMode: true, read: () => { } })
		readStream.push({ ij: 'kl' }) // 1 object is 8 bytes (2 byter per character, as concatenated by Transform)
		readStream.push({ mn: 'op' })
		readStream.push(null) // end readStream
		splitFileStream.split(readStream.pipe(myTransform), 8, __dirname + "/output/ff", (filePaths, err) => {
			assert.strictEqual(2, filePaths.length);
			return done();
		});
	});

	it("should respect maxFileSize in readable stream in objectMode with object size unmatched", (done) => {
		const myTransform = new stream.Transform({
			objectMode: true,
			transform(chunk, encoding, callback) {
				// Push the data onto the readable queue.
				callback(null, Object.keys(chunk) + Object.values(chunk)); // concatenate key+value
			}
		});

		const readStream = new stream.Readable({ objectMode: true, read: () => { } })
		readStream.push({ ij: 'kl' }) // 1 object is 8 bytes (2 byter per character, as concatenated by Transform)
		readStream.push({ mn: 'op' })
		readStream.push(null) // end readStream
		splitFileStream.split(readStream.pipe(myTransform), 9, __dirname + "/output/ff", (filePaths, err) => {
			assert.strictEqual(2, filePaths.length);
			return done();
		});
	});
});
