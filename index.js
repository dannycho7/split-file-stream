const assert = require("assert");
const fs = require("fs");
const path = require("path");
const stream = require("stream");

const _mergeFiles = (partitionIndex, partitionNames, combinationStream, callback) => {
	if(partitionIndex == partitionNames.length) {
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
	_mergeFiles(0, partitionNames, combinationStream, () => {});
	callback(combinationStream);
};


const _splitToStream = (outStreamCreate, fileStream, partitionStreamSize, callback) => {
	const outStreams = [], { highWaterMark: defaultChunkSize } = fileStream._readableState;
	let currentOutStream, currentFileSize = 0, fileStreamEnded = false, finishedWriteStreams = 0, openStream = false, partitionNum = 0;

	const endCurrentWriteStream = () => {
		currentOutStream.end();
		currentOutStream = null;
		currentFileSize = 0;
		openStream = false;
	};

	const writeStreamFinishHandler = () => {
		finishedWriteStreams++;
		if(fileStreamEnded && partitionNum == finishedWriteStreams) {
			callback(outStreams);
		}
	};

	fileStream.on("readable", () => {
		let chunk;
		while (null !== (chunk = fileStream.read(Math.min(partitionStreamSize - currentFileSize, defaultChunkSize)))) {
			if(openStream == false) {
				currentOutStream = outStreamCreate(partitionNum);
				currentOutStream.on("finish", writeStreamFinishHandler);
				outStreams.push(currentOutStream);
				partitionNum++;
				openStream = true;
			}

			currentOutStream.write(chunk);
			currentFileSize += chunk.length;

			if(currentFileSize == partitionStreamSize) {
				endCurrentWriteStream();
			}
		}
	});

	fileStream.on("end", () => {
		if(currentOutStream) {
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
	assert(maxFileSize > 0, "maxFileSize must be greater than 0");
	const partitionNames = [];

	const outStreamCreate = (partitionNum) => {
		let filePath = generateFilePath(partitionNum);
		return fs.createWriteStream(filePath);
	};

	_splitToStream(outStreamCreate, fileStream, maxFileSize, (fileWriteStreams) => {
		fileWriteStreams.forEach((fileWriteStream) => partitionNames.push(fileWriteStream["path"]));
		callback(partitionNames);
	});
};

module.exports.split = split;
module.exports.getSplitWithGenFilePath = getSplitWithGenFilePath;
module.exports._splitToStream = _splitToStream;
