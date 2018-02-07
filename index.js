const fs = require("fs");
const stream = require("stream");

const generateFileName = (rootFileName, numFiles) => `${rootFileName}.split-${numFiles}`;

module.exports.split = (fileStream, maxFileSize, rootFileName, callback) => {
	const partitionNames = [], { highWaterMark: defaultChunkSize } = fileStream._readableState;
	let currentFileSize = 0, currentFileName, openStream = false, finishedWriteStreams = 0, fileStreamEnded = false;

	let currentFileWriteStream;

	const endCurrentWriteStream = () => {
		currentFileWriteStream.end();
		currentFileWriteStream = null;
		currentFileSize = 0;
		openStream = false;
	};

	const callbackAttempt = () => {
		if(fileStreamEnded && partitionNames.length == finishedWriteStreams) {
			callback(partitionNames);
		}
	};

	fileStream.on("readable", () => {
		let chunk;
		while (null !== (chunk = fileStream.read(Math.min(maxFileSize - currentFileSize, defaultChunkSize)))) {
			if(openStream == false) {
				currentFileName = generateFileName(rootFileName, partitionNames.length);
				currentFileWriteStream = fs.createWriteStream(currentFileName);
				currentFileWriteStream.on("finish", () => {
					finishedWriteStreams++;
					callbackAttempt();
				});
				partitionNames.push(currentFileName);
				openStream = true;
			}

			currentFileWriteStream.write(chunk);
			currentFileSize += chunk.length;

			if(currentFileSize == maxFileSize) {
				endCurrentWriteStream();
			}
		}
	});

	fileStream.on("end", () => {
		if(currentFileWriteStream) {
			endCurrentWriteStream();
		}
		fileStreamEnded = true;
		callbackAttempt();
	});
};

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
	callback(combinationStream);
	_mergeFiles(0, partitionNames, combinationStream, () => {});
};