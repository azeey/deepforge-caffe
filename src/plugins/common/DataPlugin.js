// This contains functionality for plugins using the labeled data
// FIXME: This should contain the information about the layer used
// by the CaffeGenerator. That is, this file should contain all info
// about the implementation of the LabeledData node (creating caffe
// ImageData layer, etc)
define([
    'executor/ExecutorClient',
    './lib/async.min.js'
], function(
    ExecutorClient,
    async
) {
    'use strict';
    
    var DataUtils = function() {
    };

    DataUtils.prototype.prepareLabeledData = function(node, callback) {
        // Retrieve all the images from the blob
        this._retrieveImagesFromBlob(node, callback);
    };

    DataUtils.prototype._retrieveImagesFromBlob = function(node, callback) {
        var images = {};

        // Get all the image nodes
        this.core.loadChildren(node, (err, classes) => {
            if (err) {
                return callback(err);
            }

            async.each(classes, (classItem, callback) => {
                this._addClassImages(classItem, images, callback);
            }, (err) => {
                if (err) {
                    return callback(err);
                }
                var files = this._createImageFiles(images);
                return callback(null, files);
            });
        });
    };

    DataUtils.prototype._addClassImages = function(node, images, callback) {
        var imageDict = {},
            className = this.core.getAttribute(node, 'name');

        this.logger.info('adding class "' + className + '"');

        // Retrieve all the images and return them
        this.core.loadChildren(node, (err, imageNodes) => {
            if (err) {
                return callback(err);
            }
            // create dict of image name => hash
            var hashes,
                names;

            names = imageNodes
                .map(node => this.core.getAttribute(node, 'name'));

            hashes = imageNodes
                .map(node => this.core.getAttribute(node, 'hash'));

            async.map(hashes, this.blobClient.getObject.bind(this.blobClient),
                (err, objs) => {
                    var imageName;
                    if (err) {
                        return callback(err);
                    }
                    for (var i = objs.length; i--;) {
                        imageName = names[i];
                        imageDict[imageName] = objs[i];
                        this.logger.info('finished adding image "' + imageName + '"');
                    }
                    this.logger.info('finished adding class "' + className + '"');
                    images[className] = imageDict;
                    callback(null, imageDict);
                });
        });
    };

    DataUtils.prototype._createImageFiles = function(classes, callback) {
        var files = {},
            classText = [],
            path,
            classNames = Object.keys(classes),
            imageNames,
            classId;  // Create the necessary files TODO

        // Create the text file with path names
        for (var i = classNames.length; i--;) {
            imageNames = Object.keys(classes[classNames[i]]);
            classText.push(imageNames
                .map(name => `${name} ${i}`)
                .join('\n')
            );

            // Add the images to the files collection
            for (var j = imageNames.length; j--;) {
                files[imageNames[j]] = classes[classNames[i]][imageNames[j]];
            }
        }

        files['images.txt'] = classText.join('\n');
        return files;
    };

    return DataUtils;
});