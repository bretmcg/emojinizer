
// Copyright 2018 Google LLC
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//      http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.
const StorageApi = require('@google-cloud/storage');
const helpers = require('./helpers');
const storage = new StorageApi();
const createImageMagickTransform = (transform) =>
    /*
    Accepts a function transform that takes the
    infile, outfile and the input parameters
    and returns a function that can be called by the handler
    to execute that transform
     */
 (file, parameters) => {
    const outputBucketName = parameters.outputBucketName
    const outputFileName = helpers.createOutputFileName(parameters.outputPrefix, file.name)
    const tempLocalFileName = helpers.createTempFileName(file.name)
    const tempLocalOutputFileName = helpers.createTempFileName(outputFileName)
    return file
        .download({destination: tempLocalFileName})
        .then(() => transform(tempLocalFileName, tempLocalOutputFileName, parameters))
        // write errors in the transform to the console
        .catch(console.error)
        .then(() =>
            storage
                .bucket(outputBucketName)
                .upload(tempLocalOutputFileName, {destination: outputFileName})
                .then(() => storage.bucket(outputBucketName).file(outputFileName))
        )
    }
module.exports = createImageMagickTransform