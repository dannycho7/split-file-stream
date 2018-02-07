const fs = require("fs");

const generateFileName = (rootFileName, numFiles) => `${rootFileName}.split-${numFiles}`;

module.exports.split = (fileStream, maxFileSize, rootFileName, callback) => {
	const partitionNames = [], { highWaterMark: defaultChunkSize } = fileStream._readableState;
	let currentFileSize = 0, currentFileName, openStream = false, finishedWriteSreams = 0, fileStreamEnded = false;

	let currentFileWriteStream;

	const closeCurrentWriteStream = () => {
		currentFileWriteStream.end();
		currentFileWriteStream = null;
		currentFileSize = 0;
		openStream = false;
	};

	const callbackAttempt = () => {
		if(fileStreamEnded && partitionNames.length == finishedWriteSreams) {
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
					finishedWriteSreams++;
					callbackAttempt();
				});
				partitionNames.push(currentFileName);
				openStream = true;
			}

			currentFileWriteStream.write(chunk);
			currentFileSize += chunk.length;

			if(currentFileSize == maxFileSize) {
				closeCurrentWriteStream();
			}
		}
	});

	fileStream.on("end", () => {
		if(currentFileWriteStream) {
			closeCurrentWriteStream();
		}
		fileStreamEnded = true;
		callbackAttempt();
	});
};

const _mergeFiles = (partition_index, partition_names, writeOutStream, callback) => {
	if(partition_index == partition_names.length) {
		writeOutStream.close();
		return callback();
	}
	let partitionFileStream = fs.createReadStream(partition_names[partition_index]);

	partitionFileStream.on("data", (chunk) => writeOutStream.write(chunk));
	partitionFileStream.on("end", () => _mergeFiles(++partition_index, partition_names, writeOutStream, callback));
};

module.exports.mergeFiles = (partition_names, outputPath, callback) => {
	let outputWriteStream = fs.createWriteStream(outputPath);
	_mergeFiles(0, partition_names, outputWriteStream, callback);
};