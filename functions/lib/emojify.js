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
const getUrls = require('get-urls');
const fetch = require('node-fetch');
const fs = require('fs');
const https = require('https');
const urlUtil = require('url');
const uuidv4 = require('uuid/v4');

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


const getUrlContentType = (url) => {
  console.log(`Checking url ${url}`);
  return new Promise((resolve, reject) => {
    const request = https.get(url,  res => {
      const contentType = res.headers['content-type'];
      console.log(contentType);
      resolve(contentType);
    });
  });
};

const isImageContentType = (contentType) => {
  if (contentType.toLowerCase().startsWith('image')) {
    console.log(`${contentType} is an image type.`);
    return true;
  }
  return false;
};

function getImageFromAttachment(twilioBody) {
  return new Promise((resolve) => {
    let image = {
      url: twilioBody['MediaUrl0'],
      contentType: twilioBody['MediaContentType0'],
    };
    const extension = extName.mime(image.contentType)[0].ext;
    const mediaSid = path.basename(urlUtil.parse(image.url).pathname);
    image.filename = `${mediaSid}.${extension}`;
    return resolve(image);
  });
}

function getImageFromMessage(twilioBody) {
  let mediaUrl = '';
  if(hasMediaAttached(twilioBody)) {
    return getImageFromAttachment(twilioBody);
  }
  // Else find what's embedded.
  return getImageFromBodyText(twilioBody.Body);
}

const getImageFromBodyText = (str) => {
  return new Promise((resolve, reject) => {
    let urls = getUrls(str);
    if(urls.size === 0) {
      return resolve();
    }
    // Just check the first found URL because I'm lazy.
    let iterator1 = urls.values();
    let url = iterator1.next().value;
    return getUrlContentType(url)
      .then(contentType => {
        if (isImageContentType(contentType)) {
          return resolve({
            url: url,
            contentType: contentType,
            filename: url.split('/').slice(-1)[0]
          });
        } else {
          return resolve();
        }
    }).catch(err => {
      console.error(err);
      return reject(err);
    });
  });
}

function hasMediaAttached(twilioBody) {
  return (twilioBody.NumMedia > 0);
}

function hasImage(twilioBody) {
  return getImageFromMessage(twilioBody)
    .then(image => {
      console.log('image', image);
      if (!image) {
        console.log('no-image', image);
        return false;
      }
      return true;
    });
}

const emojify = (twilioBody) => {
  return new Promise((resolve, reject) => {
    getImageFromMessage(twilioBody)
      .then(image => {
        if(!image) {
          throw new Error('No image found.');
        }
        console.log('image found:', JSON.stringify(image));
        return storage
          .bucket('emojify-uploads')
          .upload(image.url, { destination: image.filename, metadata: { contentType: image.contentType}});
    }).then(response => {
      let gcsFile = response[0];
      console.log(JSON.stringify(gcsFile));
      return transformApplyEmojify(gcsFile, {outputBucketName: 'emojify-faces', outputPrefix: 'emojiface'});
    }).then(gcsFile => {
      // return console.log('obj', JSON.stringify(obj));
      let publicUrl = `https://storage.googleapis.com/${gcsFile.bucket.name}/${gcsFile.name}`;
      console.log('publicUrl', publicUrl);
      return resolve(publicUrl);
    }).catch(err => {
      console.error(err);
      reject(err);
    });
  });
};

exports.hasImage = hasImage;
exports.emojify = emojify;
