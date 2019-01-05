const http = require('http');
const util = require('util');
const { promises: fs } = require('fs');
const { log, color } = require('./log');

/**
 * The zero-dependency web application framework, i.e. poor man's express.
 * Concept of returning results (functions) loosely inspired by asp.net.
 */
class App {
  constructor(handler) {
    this._innerHandler = handler || function() { };
    this.server = http.createServer(this._handler.bind(this));

    for (let method of ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'BREW']) { // RFC 2324 compatible
      this[method.toLowerCase()] = (url, handler) => this.route(method, url, handler);
    }
  }

  /**
   * Returns a status code result with an optional body.
   *
   * @param {Number} code The status code
   * @param {String|Buffer} [body] The response body
   * @param {String} [contentType] The content type, defaulting to text/plain
   * @returns {Function}
   */
  status = (code, body, contentType = 'text/plain') => (req, res) => {
    res.statusCode = code;
    res.setHeader('Content-Type', contentType);
    res.end(body || code.toString());
  };

  /**
   * Returns a result that sends a body with a 200 OK status.
   *
   * @param {String|Buffer} body The response body
   * @param {String} contentType The content type
   * @returns {Function}
   */
  ok = (body, contentType) => this.status(200, body, contentType);

  /**
   * Returns a result that sends a file with a 200 OK status.
   *
   * @param {String} filePath The local file path
   * @param {String} contentType The content type of the file
   * @returns {Function}
   */
  file = (filePath, contentType) => async (req, res) => {
    res._redir = filePath;
    return this.ok(await fs.readFile(filePath), contentType)(req, res);
  };

  async _handler(req, res) {
    // Get start time and log request once finished
    let start = Date.now();
    res.on('close', () => {
      let duration = Date.now() - start;
      let status =
        res.statusCode == 200 ? color.green(res.statusCode) :
        res.statusCode >= 500 ? color.red(res.statusCode) :
        res.statusCode >= 400 ? color.yellow(res.statusCode) :
        color.blue(res.statusCode);
      let message = `${req.method} ${req.url} ${status} ${duration}ms`;
      if (res._redir) {
        message += ` -> ${color.blue(res._redir)}`;
      }
      log(message);
    });
    // Execute handler
    try {
      let result = await this._innerHandler.call(this, req, res);
      if (typeof result == 'function') {
        // Execute the result
        await result(req, res);
        if (!res.finished) {
          res.end();
        }
      } else {
        // No routes matched
        this.status(res._wrongMethod ? 405 : 404)(req, res);
      }
    } catch (e) {
      console.error(e);
      this.status(500, util.inspect(e))(req, res);
    }
  }

  /**
   * Starts listening for requests. Same as Server#listen().
   *
   * @returns {http.Server}
   */
  listen = (...args) => this.server.listen(...args);

  /**
   * Sets up a handler for requests matching a given route.
   *
   * @param {String} method The request method to match
   * @param {String|RegExp} url The request url to match, with leading slash
   * @param {Function} handler The request handler
   */
  route(method, url, handler) {
    let prev = this._innerHandler;
    this._innerHandler = async function(req, res) {
      // First handler in the chain that returns a result ends it
      let result = await prev.call(this, req, res);
      // If nothing's returned a result so far, check if request matches route
      if (!result && (url instanceof RegExp ? url.test(req.url) : req.url == url)) {
        if (req.method == method) {
          result = await handler.call(this, req, res);
        } else {
          // Matched url but not method; setting a flag to trigger a 405 instead
          // of 404 if no other routes match
          res._wrongMethod = true;
        }
      }
      return result;
    };
  }
}

module.exports = App;
