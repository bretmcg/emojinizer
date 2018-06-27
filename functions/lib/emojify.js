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

const extName = require('ext-name');
const path = require('path');
const fetch = require('node-fetch');
const fs = require('fs');
const urlUtil = require('url');

const helpers = require('./helpers')
const createImageMagickTransform = require('./decorator')
const VisionApi = require('@google-cloud/vision').v1p2beta1;
const vision = new VisionApi.ImageAnnotatorClient();
const StorageApi = require('@google-cloud/storage');
const storage = new StorageApi();

const PUBLIC_DIR = '/tmp';
const EMOJI_BUCKET = 'emojify-emojis';
const emojis = {
  joyLikelihood: 'joy.png',
  angerLikelihood: 'anger.png',
  sorrowLikelihood: 'sorrow.png',
  surpriseLikelihood: 'surprise.png',
  expressionless: 'none.png',
}


const downloadEmojis = () =>
    Promise.all(
        Object.keys(emojis)
            .map((key) =>
                storage
                    .bucket(EMOJI_BUCKET)
                    .file(emojis[key])
                    .download({destination: `/tmp/${emojis[key]}`}))
    )

  const determineEmoji = (face) => {
      console.log(face)
      return emojis[Object.keys(emojis).reduce(
          (emotion, nextEmotion) =>
              ['VERY_LIKELY', 'LIKELY', 'POSSIBLE'].includes(face[nextEmotion])
              ? nextEmotion
              : emotion
          , 'expressionless'
      )]
  }

  const faceAnnotationToCoordinate = (faceAnnotation) => {
    const vertices = faceAnnotation.boundingPoly.vertices
    const xValues = vertices.map((vertex) => vertex.x)
    const yValues = vertices.map((vertex) => vertex.y)
    const xMax = Math.max(...xValues)
    const xMin = Math.min(...xValues)
    const yMax = Math.max(...yValues)
    const yMin = Math.min(...yValues)
    const width = xMax - xMin
    const height = yMax - yMin
    return `+${xMin}+${yMin}`
}
const faceAnnotationToDimensions = (faceAnnotation) => {
    const vertices = faceAnnotation.boundingPoly.vertices
    const xValues = vertices.map((vertex) => vertex.x)
    const yValues = vertices.map((vertex) => vertex.y)
    const xMax = Math.max(...xValues)
    const xMin = Math.min(...xValues)
    const yMax = Math.max(...yValues)
    const yMin = Math.min(...yValues)
    const width = xMax - xMin
    const height = yMax - yMin
    return `${width}x${height}`
}
const faceAnnotationToEmojiComposite = (faceAnnotation) => (
    [
        '(',
        `/tmp/${determineEmoji(faceAnnotation)}`,
        '-resize',
        faceAnnotationToDimensions(faceAnnotation),
        ')',
        '-geometry',
        faceAnnotationToCoordinate(faceAnnotation),
        '-composite',
    ]
)
const applyComposites = (inFile, outFile, {composites}) =>
    helpers.resolveImageMagickConvert([
        inFile,
        ...composites,
        outFile,
    ])
const transformApplyComposites = createImageMagickTransform(applyComposites)
const transformApplyEmojify = (file, parameters) =>
    /*
    Use the vision api to annotate the
    faces in an image and then convet them
    to emojis based on the emotion they have
     */
    Promise.all([
        // send a remote url to the vision api
        vision.faceDetection(`gs://${file.bucket.name}/${file.name}`),
        // simultaneously download all of the necessary emojis
        downloadEmojis(),
    ])
    
    
        // convert the result to its most relevant emoji
        .then(([[{faceAnnotations}]]) =>
            faceAnnotations
                .map(faceAnnotationToEmojiComposite)
                .reduce((acc, nextComposite) => acc.concat(nextComposite), [])
        )
        
        .then((composites) => transformApplyComposites(file, Object.assign(parameters, {composites})))

    transformApplyEmojify.parameters = {
        outputPrefix: {
            defaultValue: 'emojis',
            validate: () => true,
        },
        outputBucketName: {
            defaultValue: 'emojify-faces',
            validate: () => true,
        },
    }

const hasImage = (body) => {
  return body.NumMedia > 0;
};
const emojify = (body) => {
    if (!hasImage(body))
      return Promise.reject(new Error('No media attached.'));

    const mediaUrl = body['MediaUrl0'];
    const contentType = body['MediaContentType0'];
    const extension = extName.mime(contentType)[0].ext;
    const mediaSid = path.basename(urlUtil.parse(mediaUrl).pathname);
    const filename = `${mediaSid}.${extension}`;

    return storage
      .bucket('emojify-uploads')
      .upload(mediaUrl, { destination: filename, metadata: { contentType: contentType}})
    .then(response => {
      let gcsFile = response[0];
      console.log(JSON.stringify(gcsFile));
      return transformApplyEmojify(gcsFile, {outputBucketName: 'emojify-faces', outputPrefix: 'emojiface'});
    }).then(gcsFile => {
      // return console.log('obj', JSON.stringify(obj));
      return `https://storage.googleapis.com/${gcsFile.bucket.name}/${gcsFile.name}`;
    });
};

exports.hasImage = hasImage;
exports.emojify = emojify;