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

  createAccount: function ({ username, password }) {
    
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
  
  deleteAccount: function ({ user_id }) {
    console.log('mongo.js deleteAccount user_id: ' + user_id)
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
  
  fetchItems: function ({ user_id, query }) {
    return db.collection('items.' + user_id)
      .find(query)
      .skip(0)
      .limit(100)
      .toArray()
      .then(docs => {
        docs.forEach(actions.convertItem)
        return docs
      })
  },
  
  copyItems: function ({ user_id, item_ids }) {
    return db.collection('items.' + user_id)
      .find(query)
      .skip(0)
      .limit(100)
      .toArray()
      .then(docs => {
        docs.forEach(doc => {
          
        })
      })
  },
  
  deleteItems: function ({ user_id, item_ids }) {
    return db.collection('items.' + user_id).deleteMany({ _id: { $in: item_ids } })
  },
  
  convertItem: function (item) {
    item.updated = moment(item.updated).format('MMM D HH:mm:ss')
  }
}

module.exports = actions
