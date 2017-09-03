// https://team.goodeggs.com/export-this-interface-design-patterns-for-node-js-modules-b48a3b1f8f40
const MongoClient = require('mongodb').MongoClient
const moment = require('moment')

let db

const actions = {
  
  connect: function (url, options, callback) {
    return new Promise((resolve, reject) => {
      if (db) {
        resolve(db)
      } else {
        console.log('[MONGO] CONNECT')
        return MongoClient.connect(url, options, callback).then(dbobj => {
          db = dbobj
          resolve(db)
        })
      }
    })
  },
  
  getNextId: function (name) {
    return db.collection('counters').findOneAndUpdate(
      { _id: name },
      { $inc: { seq: 1 } },
      { upsert: true, returnOriginal: false }
    )
  },

  createUser: function ({ username, password }) {
    
    // todo: encrypt password
    const user = {
      username: username,
      password: password
    }
    
    return db.collection('users').findOne({ username: username }).then(r => {
      console.dir(r)
      if (r) {
        reject('username ' + username + ' already exists')
      }
    }).then(() => {
      return this.getNextId('users')
    }).then(r => {
      payload._id = r.value.seq
      return db.collection('users').insertOne(user)
    })
  },
  
  deleteUser: function ({ user_id }) {
    console.log('mongo.js deleteAccount user_id: ' + user_id)
  },
  
  addAccount: function (user_id, account) {
    let users = db.collection('users')
    users.update(
      {
        _id: user_id,
        accounts: {
          $elemMatch: {
            provider: account.provider,
            id: account.id
          }
        }
      },
      { $set: { 'accounts.$': account } },
      { safe: true }
    ).then(r => {
      console.dir(r.result)
      if (r.result.n == 0) {
        return users.update(
          { _id: user_id },
          { $addToSet: { 'accounts': account } },
          { safe: true }
        )
      }
    })
  },
  
  saveItem: function({ user_id, item }) {
    
    item.updated = new Date()
    
    const coll = 'items.' + user_id
    
    if (item._id) {
      // existing item
      return db.collection(coll).updateOne({ _id: item._id }, item)
    } else {
      // new item
      return this.getNextId(coll).then(r => {
        item._id = r.value.seq
        return db.collection(coll).insertOne(item)
      })
    }
  },
  
  fetchItem: function ({ user_id, item_id }) {
    return db.collection('items.' + user_id).findOne({ _id: item_id })
  },
  
  fetchItems: function ({ user_id, filter, page }) {
    
    const query = actions.convertQueries(filter.queries)
    const sort = actions.convertSorting(filter.sorting)
    
    const limit = 10
    const skip = page ? limit * ( page - 1 ) : 0
    
    const cursor = db.collection('items.' + user_id).find(query)
    
    return cursor.count().then(count => {
      
      const paging = {
        start: skip + 1,
        end: (skip + limit < count) ? (skip + limit) : count,
        count: count,
        hasPrev: (page > 1),
        hasNext: (skip + limit < count)
      }
      
      return cursor.sort(sort).skip(skip).limit(limit).toArray().then(items => {
        items.forEach(actions.convertItem)
        return { items: items, paging: paging }
      })
    })
  },
  
  copyItems: function ({ user_id, item_ids }) {
    
    console.dir(item_ids)
    const query = { _id: { $in: item_ids } }
    const coll = 'items.' + user_id

    return db.collection(coll).find(query).toArray().then(docs => {
      
      const copies = docs.map(doc => {
        return this.getNextId(coll).then(r => {
          const copied = Object.assign({}, doc)
          copied._id = r.value.seq
          return copied
        })
      })
      
      return Promise.all(copies).then(copied_items => {
        console.dir(copied_items)
        return db.collection(coll).insertMany(copied_items)
      })
    })
  },
  
  deleteItems: function ({ user_id, item_ids }) {
    return db.collection('items.' + user_id).deleteMany({ _id: { $in: item_ids } })
  },
  
  convertItem: function (item) {
    item.updated = moment(item.updated).format('MMM D HH:mm')
  },
  
  escapeRegExp: function (str) {
    return str.replace(/[\-\[\]\/\{\}\(\)\*\+\?\.\\\^\$\|]/g, "\\$&")
  },

  convertQueries: function (queries) {
    let converted = {}
    for (var i in queries) {
      var q = queries[i]
      if (!q.field) continue
      
      // todo: AND for multiple queries
      if (q.condition == 'is equal to') {
        converted[q.field] = q.value
      } else if (q.condition == 'is not equal to') {
        converted[q.field] = { $ne: q.value }
      } else if (q.condition == 'contains') {
        converted[q.field] = new RegExp(actions.escapeRegExp(q.value), 'i')
      } else if (q.condition == 'does not contain') {
        converted[q.field] = { $ne: new RegExp(actions.escapeRegExp(q.value), 'i') }
      }
    }
    return converted
  },
  
  convertSorting: function (sorting) {
    let converted = []
    for (var i in sorting) {
      var s = sorting[i]
      if (!s.field) continue
      
      if (s.order == 'asc') {
        converted.push([ s.field, 1 ])
      } else if (s.order == 'desc') {
        converted.push([ s.field, -1 ])
      }
    }
    return converted
  }
}

module.exports = actions
