var through2 = require('through2')
  , extname  = require('path').extname
  , dirname  = require('path').dirname
  , fs       = require('fs')
  , join     = require('path').join
  , relative = require('path').relative
  , resolve  = require('path').resolve
  , crypto   = require('crypto')
  , _        = require('underscore')
  , debug    = require('debug')('unifyurl')
;

var matchUrl = /url\s*\(\s*(['"]?)([^)]+)\1\s*\)/g;

// See [grunt-transfo transforms option](https://github.com/nopnop/grunt-transfo#transforms)
module.exports = function(src, dest, options, addFile) {

  debug('Processing %s->%s', src, dest);


  // css
  var uopt = _.extend({

    // Assets destination: relative to the css destination path.
    dest:       './',

    // Url to the destination (default is a resolved
    // relative path based on dest value)
    url:        null,

    // List source extension to process. Other sources are ignored.
    extensions: ['.css']

  }, options.unifyurl || {});


  debug('  options:', uopt);

  if(!~uopt.extensions.indexOf(extname(src))) {
    debug('  ignore extension:', extname(src));
    return through2();
  }


  var i = 0;
  var rewrite = function(chunk, encoding, next) {

    chunk = chunk.toString();

    if(matchUrl.test(chunk)) {

      chunk = chunk.replace(matchUrl, function(match, quote, path, offset, str) {
        var stat, from, to, uid, toUrl, hashName;



        var abspath = /^(\w+\:|\/)/;
        // Only relative path
        if(abspath.test(path)) {
          return match;
        }

        // ignore parameters
        if(/#/.test(path)) {
          path = path.slice(0, path.indexOf('#'));
        }
        if(/\?/.test(path)) {
          path = path.slice(0, path.indexOf('?'));
        }


        debug('  match url:%s path:%s', match, path);

        from   = join(dirname(src),  path);

        if(from.slice(0,2) === '..') {
          throw(new Error('Error: File path out of project:', from));
        }

        try {
          stat = fs.statSync(from);
        } catch(e) {
          console.warn("Cannot find source file:", from);
          return match;
        }

        uid = crypto.createHash('md5')
          .update(from)
          .digest('hex');

        hashName = uid + extname(from);
        toUrl    = (uopt.url || uopt.dest);
        toUrl   += toUrl.slice(-1) === '/' ? '' : '/';
        toUrl   += hashName;
        to       = join(dirname(dest), uopt.dest, hashName);


        debug('  %s->%s url("%s")', from, to, toUrl);

        // Add file to transfo pipeline
        addFile([from], to);

        // Override url
        return 'url("'+toUrl+'")';

      });
    }
    debug('PUSH LINE ');

    this.push(chunk);

    debug('PUSH LINE ok');

    next();

  };

  return through2(rewrite);
};