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
const path = require('path');
const im = require('imagemagick')
const cropHintsToGeometry = (cropHintsAnnotation) => {
    const vertices = cropHintsAnnotation.cropHints[0].boundingPoly.vertices
    const xValues = vertices.map((vertex) => vertex.x)
    const yValues = vertices.map((vertex) => vertex.y)
    const xMax = Math.max(...xValues)
    const xMin = Math.min(...xValues)
    const yMax = Math.max(...yValues)
    const yMin = Math.min(...yValues)
    const width = xMax - xMin
    const height = yMax - yMin
    return `${width}x${height}+${xMin}+${yMin}`
    // return [xMin, xMax, yMin, yMax]
}
const faceAnnotationToBoundingPoly = (faceAnnotation) => {
    const boundingPoly = faceAnnotation.boundingPoly
    const vertices = boundingPoly.vertices
    return vertices.map(({x, y}) => [x, y].join(",")).join(" ")
}
const createOutputFileName = (prefix = "", fileName) => 
    prefix
    ? `${prefix}-${path.parse(fileName).base}`
    : `${path.parse(fileName).base}.out`
const createTempFileName = (fileName) => `/tmp/${path.parse(fileName).base}`
/*
Accept an array of arguments to be passed to
imagemagick's convert method and return
a promise the resolves when the
transformation is complete.
This should be a helper...
 */
const resolveImageMagickCommand = (cmd, args) =>
    new Promise(
        (resolve, reject) =>
            cmd(args, (err, result) => err ? reject(err) : resolve(result))
    )
const resolveImageMagickIdentify = args => resolveImageMagickCommand(im.convert, args)
const resolveImageMagickConvert = (args) =>
    new Promise(
        (resolve, reject) =>
            im
                .convert(
                    args,
                    (err, stdout) => {
                        console.log('Finished ImageMagick transformation')
                        if (err) {
                            console.error('ImageMagick transformation failed for arguments', args, err)
                            reject(err)
                        } else {
                            console.log('ImageMagick transformation was successful.', args)
                            resolve()
                        }
                    }
                )
    )
// const execImageMagickScript = (args) => {
//     cmd = args.join(" ")
//     return execute(cmd)
//     // console.log("CMD is", cmd)
//     // const result = shell.exec(cmd)
//     // console.log("result is", result)
//     // try{
//     //     exec(cmd)
//     // }
//     // catch (e) {
//     //     console.log(e)
//     // }
    
//     return Promise.resolve()
// }
    // new Promise(
    //     (resolve, reject) => {
    //         console.log("Yo waddup")
    //         const cmd = args.join(" ");
    //         execute()
    //         console.log("Executing", cmd);
    //         exec(cmd, (err, stdout) => {
    //             if (err) {
    //                 console.error('ImageMagick script failed for arguments', args, err)
    //                 reject(err)
    //             } else {
    //                 console.log('ImageMagick script was successful.', args)
    //                 resolve()
    //             }
    //         })
    //     }
    //     )
module.exports = {
    // imageMagickConvert,
    resolveImageMagickConvert,
    resolveImageMagickIdentify,
    resolveImageMagickCommand,
    // execImageMagickScript,
    cropHintsToGeometry,
    createOutputFileName,
    createTempFileName,
    faceAnnotationToBoundingPoly,
}
