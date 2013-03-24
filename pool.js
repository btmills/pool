;({ define: typeof define === 'function'
	? define
	: function (A, F) { module.exports = F.apply(null, A.map(require)) }
}).define(['rethinkdb', './queue'], function (r, Queue) {

	'use strict';

	var r = require('rethinkdb');

	var Pool = function (opts) {

		// Queue of callbacks awaiting a connection
		var q = new Queue();
		// Stack of available connections
		var pool = [];

		// Initialize the connections in the pool
		// Must be called first
		// callback is function (err)
		var init = function (callback) {
			if (pool && pool.length < opts.size) { // Add another connection
				r.connect(opts.conninfo, function (err, conn) {
					if (err) return callback(err);

					pool.push(conn);
					init(callback);
				});
			} else { // Pool has been filled
				callback(null);
			}
		};

		// Get a connection from the pool
		// callback is function (conn)
		var get = function (callback) {
			if (pool.length > 0) {
				callback(pool.pop());
			} else {
				q.enqueue(callback);
			}
		};

		// Return a connection to the pool
		var done = function (conn) {
			// For purposes of experimentation, assume conn is valid
			// Would need to check for real-world use

			// Either give the connection to the next callback in q
			// or return it to the pool
			if (q.length() > 0) {
				process.nextTick(function () {
					(q.dequeue())(conn);
				});
			} else {
				pool.push(conn);
			}
		};

		// Close all connections in the pool
		var close = function () {
			while (pool.length > 0) {
				(pool.pop()).close();
			}
		};

		return {
			init: init,
			get: get,
			done: done,
			close: close
		};

	};

	return Pool;

});
