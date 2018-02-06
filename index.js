const fs = require("fs");

const generateFileName = (rootFileName, numFiles) => `${rootFileName}.split-${numFiles}`;

module.exports.split = (fileStream, maxFileSize, rootFileName, callback) => {
	const partitionNames = [], { highWaterMark: defaultChunkSize } = fileStream._readableState;
	let currentFileSize = 0, currentFileName, openStream = false;

	let currentFileWriteStream;

	fileStream.on("readable", () => {
		let chunk;
		while (null !== (chunk = fileStream.read(Math.min(maxFileSize - currentFileSize, defaultChunkSize)))) {
			console.log(`Received ${chunk.length} bytes of data.`);

			if(openStream == false) {
				currentFileName = generateFileName(rootFileName, partitionNames.length);
				currentFileWriteStream = fs.createWriteStream(currentFileName);
				partitionNames.push(currentFileName);
				openStream = true;
			}

			currentFileWriteStream.write(chunk);
			currentFileSize += chunk.length;

			if(currentFileSize == maxFileSize) {
				currentFileWriteStream.end();
				currentFileWriteStream = null;
				currentFileSize = 0;
				openStream = false;
			}
		}
	});

	fileStream.on("close", () => {
		callback(partitionNames);
	});
};

module.exports.mergeFiles = (partition_names, outputPath, callback) => {
	let outputWriteStream = fs.createWriteStream(outputPath);
	let partition_index = 0;


};