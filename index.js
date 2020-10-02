const fs = require("fs");
const path = require("path");
const stream = require("stream");

const _mergeFiles = (partitionIndex, partitionNames, combinationStream, callback) => {
	if (partitionIndex == partitionNames.length) {
		combinationStream.end();
		return callback();
	}
	let partitionFileStream = fs.createReadStream(partitionNames[partitionIndex]);

	partitionFileStream.on("data", (chunk) => combinationStream.write(chunk));
	partitionFileStream.on("end", () => _mergeFiles(++partitionIndex, partitionNames, combinationStream, callback));
};

module.exports.mergeFilesToDisk = (partitionNames, outputPath, callback) => {
	let combinationStream = fs.createWriteStream(outputPath);
	_mergeFiles(0, partitionNames, combinationStream, callback);
};

module.exports.mergeFilesToStream = (partitionNames, callback) => {
	let combinationStream = new stream.PassThrough();
	_mergeFiles(0, partitionNames, combinationStream, () => { });
	callback(combinationStream);
};


const _splitToStream = (outStreamCreate, fileStream, partitionStreamSize, callback) => {
	const outStreams = [], { highWaterMark: defaultChunkSize, objectMode: isObjectMode } = fileStream._readableState;
	let currentOutStream, currentFileSize = 0, fileStreamEnded = false, finishedWriteStreams = 0, openStream = false, partitionNum = 0, err = null;

	const endCurrentWriteStream = () => {
		currentOutStream.end();
		currentOutStream = null;
		currentFileSize = 0;
		openStream = false;
	};

	const createNewWriteStream = () => {
		currentOutStream = outStreamCreate(partitionNum);
		currentOutStream.on("finish", writeStreamFinishHandler);
		outStreams.push(currentOutStream);
		partitionNum++;
	}

	const writeStreamFinishHandler = () => {
		finishedWriteStreams++;
		if (fileStreamEnded && partitionNum == finishedWriteStreams) {
			callback(err, outStreams);
		}
	};

	fileStream.on("readable", () => {
		let chunk;
		while (null !== (chunk = fileStream.read(Math.min(partitionStreamSize - currentFileSize, defaultChunkSize)))) {
			if (openStream == false) {
				createNewWriteStream();
				openStream = true;
			}

			// A Readable stream in object mode will always return a single item from a call to readable.read(size), regardless of the value of the size argument.
			const writeChunk = isObjectMode ? JSON.stringify(chunk) : chunk

			if ((currentFileSize + writeChunk.length) <= partitionStreamSize) {
				currentOutStream.write(isObjectMode ? JSON.stringify(chunk) : chunk);
				currentFileSize += isObjectMode ? JSON.stringify(chunk).length : chunk.length;
				if (currentFileSize == partitionStreamSize) {
					endCurrentWriteStream();
				}
			} else {
				if (writeChunk.length > partitionStreamSize) {
					// In objectMode one object is read from the stream, it could be that the size is bigger than the partition size
					err = new RangeError("Could not fit object into maxFileSize")
				} else {
					endCurrentWriteStream();
					createNewWriteStream();
					currentOutStream.write(isObjectMode ? JSON.stringify(chunk) : chunk);
					currentFileSize += isObjectMode ? JSON.stringify(chunk).length : chunk.length;
				}
			}
		}
	});

	fileStream.on("end", () => {
		if (currentOutStream) {
			endCurrentWriteStream();
		}
		fileStreamEnded = true;
	});
};

const split = (fileStream, maxFileSize, rootFilePath, callback) =>
	_split(fileStream, maxFileSize, (n) => `${rootFilePath}.split-${n}`, callback);

const getSplitWithGenFilePath = (generateFilePath) =>
	(f, m, callback) => _split(f, m, generateFilePath, callback);

const _split = (fileStream, maxFileSize, generateFilePath, callback) => {
	if (maxFileSize <= 0) {
		throw new RangeError("maxFileSize must be greater than 0");
	}
	const partitionNames = [];

	const outStreamCreate = (partitionNum) => {
		let filePath = generateFilePath(partitionNum);
		return fs.createWriteStream(filePath);
	};
	_splitToStream(outStreamCreate, fileStream, maxFileSize, (err, fileWriteStreams) => {
		fileWriteStreams.forEach((fileWriteStream) => partitionNames.push(fileWriteStream["path"]));
		callback(err, partitionNames);
	});
};

module.exports.split = split;
module.exports.getSplitWithGenFilePath = getSplitWithGenFilePath;
module.exports._splitToStream = _splitToStream;
