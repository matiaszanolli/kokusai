'use strict';

var path    = require('path'),
    fs      = require('fs'),
    Promise = require('promise'),
    _       = require('underscore');

_.defaults = require('merge-defaults');

// Represents a localized configuration
var Locale = function(options) {
  this.space = options.space;
  
  this.lang = options.lang;
  
  this.name = options.name;

  this.content = {};
};

// Retrieves the configuration node associated with a key
Locale.prototype.get = function(key) {
  var ptr = this.content;
  if (typeof(key) === 'string') {
    var route = key.split('.');
    for (var prop in route) {
      if (typeof(ptr) === 'object')
        ptr = ptr[route[prop]];
      else
        return undefined;
    }
    return ptr;
  }
  return undefined;
};

// Loads a configuration file
var loadContent = function(space, lang, options) {
  var base_path = options.base_path || 'locales',
      parts = [ base_path ];
  
  if(typeof space === 'string')
    parts.push(space);
  
  if(typeof lang === 'string')
    parts.push(lang);
  
  parts.push(options.name);

  var config_path = path.join.apply(undefined, parts);
  if(config_path.substring(config_path.length - 5) !== '.json') {
      config_path += '.json';
  }

  return new Promise(function(fulfill, reject){
    fs.exists(config_path, function(exists){
      if(exists){
        fs.readFile(config_path, function(err, data){
          if(err){
            fulfill({}, options);
          } else {
            try {
              fulfill(JSON.parse(data), options);
            } catch(err){
              err.message = 'Error parsing file "' + config_path + '"';
              throw err;
            }
          }
        });
      } else {
        fulfill({}, options);
      }
    });
  });
};

// Merges a partial configuration with the content of another configuration file
var mergeConfig = function(config, space, lang, options) {
  return new Promise(function(fulfill, reject){
    loadContent(space, lang, options)
    .then(function(loaded){
      config = _.defaults(config, loaded);
      fulfill(config);
    });
  });
};

/* Loads a localized configuration file 
  @param name: The configuration file name
  @param options.base_path: Base path for localization files (default: 'locales')
  @param options.space: The space name or country code
  @param options.lang: The language code
*/
module.exports.load = function(name, options) {
  var space = options.space || 'default'
    , lang = options.lang;
  options.name = name;

  // Load the most specific configuration
  return mergeConfig({}, space, lang, options)
  .then(function(config){
    // Then merge it with the space configuration
    return mergeConfig(config, space, null, options);
  })
  .then(function(config){
    // Then merge it with the language configuration
    return mergeConfig(config, 'default', lang, options);
  })
  .then(function(config){
    // Finally merge it with the default configuration
    return mergeConfig(config, 'default', null, options);  
  })
  .then(function(config){
    var locale = new Locale(options);
    locale.content = config;

    return Promise.resolve(locale);
  });
};