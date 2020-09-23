const assert = require("assert");
const fs = require("fs");
const stream = require("stream");
const splitFileStream = require("..");

// This will run after each test in all test modules.
afterEach(function(done){
	fs.readdir(__dirname + "/output", function(err, files){
		for(var file of files){
			fs.unlink(__dirname + "/output/" + file, function(err){
				if (err) return done(err);
			});
		}
		done();
	});
})

describe("#mergeFilesToDisk", () => {
	it("Should merge 2 1mb partitions into one file", (done) => {
		let readStream = new stream.PassThrough();
		readStream.end(new Buffer.alloc(1024 * 1024 * 2));

		splitFileStream.split(readStream, 1024 * 1024 * 1, __dirname + "/output/ff", (filePaths, err) => {
			assert.strictEqual(2, filePaths.length);
			let mergeFilePath = __dirname + "/output/ff.fullfile";
			splitFileStream.mergeFilesToDisk(filePaths, mergeFilePath, () => {
				fs.stat(mergeFilePath, (err, stats) => {
					assert.strictEqual(1024 * 1024 * 2, stats.size);
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

		splitFileStream.split(readStream, 1024 * 1024 * 1, __dirname + "/output/ff", (filePaths, err) => {
			assert.strictEqual(2, filePaths.length);
			let mergeFilePath = __dirname + "/output/ff.fullfile";
			splitFileStream.mergeFilesToStream(filePaths, (stream) => {
				let dataLength = 0;
				stream.on("data", (chunk) => {
					dataLength += chunk.length;
				});

				stream.on("finish", () => {
					assert.strictEqual(dataLength, 1024 * 1024 * 2);
					return done();
				});
			});
		});
	});
});
