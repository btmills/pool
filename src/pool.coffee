(
 	define: if typeof define == 'function' then define \
 		else (A, F) -> module.exports = F.apply(null, A.map(require))
).define ['rethinkdb', './queue'], (r, Queue) ->

	'use strict'

	Pool = (opts) ->

		q = new Queue
		pool = []

		init = (callback) ->
			if pool? and pool.length < opts.size
				r.connect opts.db, (err, conn) ->
					return callback err if err
					pool.push conn
					init callback
			else
				callback null

		get = (callback) ->
			if pool.length > 0
				callback pool.pop()
			else
				q.enqueue callback

		done = (conn) ->
			if q.length > 0
				process.nextTick ->
					(q.dequeue())(conn)
			else
				pool.push conn

		close = ->
			while pool.length > 0
				(pool.pop()).close()

		return {
			init: init
			get: get
			done: done
			close: close
		}
