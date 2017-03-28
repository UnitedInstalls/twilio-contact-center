const mongoose = require('mongoose')
const bcrypt = require('bcrypt')

mongoose.connect('mongodb://localhost/dbName')

const db = mongoose.connection;

const UserSchema = mongoose.Schema({
    _id: mongoose.Schema.Types.ObjectId,
    username: { type: String },
    password: { type: String },
    email: { type: String },
    firstName: { type: String },
    lastName: { type: String },
    isActive: { type: Boolean },
    isAdmin: { type: Boolean },
    dateCreated: { type: Date },
    dateModified: { type: Date }
})

const User = module.exports = mongoose.model('User', UserSchema)

module.exports.createUser = (newUser, callback) => {
    bcrypt.genSalt(10, function(err, salt) {
        bcrypt.hash(newUser.password, salt, function(err, hash) {
            newUser.password = hash
            newUser.save(callback)
        });
    });
}