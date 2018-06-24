const fs = require("fs");
const stream = require("stream");

const generateFilePath = (rootFileName, numFiles) => `${rootFileName}.split-${numFiles}`;

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

module.exports.split = (fileStream, maxFileSize, rootFileName, callback) => {
	const partitionNames = [], { highWaterMark: defaultChunkSize } = fileStream._readableState;
	let currentFileSize = 0, currentFilePath, currentFileWriteStream, openStream = false, finishedWriteStreams = 0, fileStreamEnded = false;

	const endCurrentWriteStream = () => {
		currentFileWriteStream.end();
		currentFileWriteStream = null;
		currentFileSize = 0;
		openStream = false;
	};

	const writeStreamFinishHandler = () => {
		finishedWriteStreams++;
		if(fileStreamEnded && partitionNames.length == finishedWriteStreams) {
			callback(partitionNames);
		}
	};

	fileStream.on("readable", () => {
		let chunk;
		while (null !== (chunk = fileStream.read(Math.min(maxFileSize - currentFileSize, defaultChunkSize)))) {
			if(openStream == false) {
				currentFilePath = generateFilePath(rootFileName, partitionNames.length);
				currentFileWriteStream = fs.createWriteStream(currentFilePath);
				currentFileWriteStream.on("finish", writeStreamFinishHandler);
				partitionNames.push(currentFilePath);
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
	});
};
