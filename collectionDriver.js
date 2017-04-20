var ObjectID = require('mongodb').ObjectID;

CollectionDriver = function(db) {
  this.db = db;
};

CollectionDriver.prototype.getCollection = function(collectionName, callback) {
  this.db.collection(collectionName, function(error, the_collection) {
    if( error ) callback(error);
    else callback(null, the_collection);
  });
};

CollectionDriver.prototype.findAll = function(collectionName, callback) {
    this.getCollection(collectionName, function(error, the_collection) { //A
		if(error) {
			callback(error);
		}
		else {
			the_collection.find().toArray(function(error, results) { //B
				if(error) {
					callback(error); }
				else {
					callback(null, results); }
			});
		}
    });
};

// Note: Reading from a non-existent collection or entity is not an error – the MongoDB driver just returns an empty container.

CollectionDriver.prototype.get = function(collectionName, id, callback) { //A
    this.getCollection(collectionName, function(error, the_collection) {
        if (error) callback(error);
        else {
            var checkForHexRegExp = new RegExp("^[0-9a-fA-F]{24}$"); //B
            if (!checkForHexRegExp.test(id)) callback({error: "invalid id"});
            else the_collection.findOne({'_id':ObjectID(id)}, function(error,doc) { //C
                if (error) callback(error);
                else callback(null, doc);
            });
        }
    });
};

// To save a new object!
CollectionDriver.prototype.save = function(collectionName, obj, callback) {
	this.getCollection(collectionName, function(error, the_collection) { // Line A
		if (error) callback(error)
		else {
			obj.created_at = new Date(); //Line B
			the_collection.insert(obj, function() { // Line C
				callback(null, obj);
			});
		}
	});
};

//update a specific object - Note: This does not support property specific updating: Updating an object means replacing the old object with an entirely new one
CollectionDriver.prototype.update = function(collectionName, obj, entityId, callback) {
    this.getCollection(collectionName, function(error, the_collection) {
		if (error) callback(error);
		else {
			obj._id = ObjectID(entityId); //A convert to a real obj id
			obj.updated_at = new Date(); //B
			the_collection.save(obj, function(error,doc) { //C
				if (error) callback(error);
				else callback(null, obj);
			});
		}
	});
};

// Delete a specfic object
CollectionDriver.prototype.delete = function(collectionName, entityId, callback) {
	var self = this;
	this.getCollection(collectionName, function(error, the_collection) { //A
		if (error) callback(error);
		else {
			self.get(collectionName, entityId, function(error, objs){
				var objectToDelete = objs;
				if (error) callback(error);
				else {
					the_collection.remove({'_id':ObjectID(entityId)}, function(error,doc) { //B
						var doc_string = "DOCS REMOVED: " + doc;
						console.log(doc_string); //sent to SERVER CONSOLE
						if (error) callback(error);
						else callback(null, objectToDelete);
					});
				}
			});
		}
	});
};

// The app can be bombarded with requests so this method allow the user to filter for their area so that they only get back data that matches the results of this query search (incorporated with mongodb)
// Perform a colleciton query using mongodb's geospatial querying
CollectionDriver.prototype.query = function(collectionName, query, callback) { // 1
	this.getCollection(collectionName, function(error, the_collection) { // 2
		if (error) callback(error)
		else {
			the_collection.find(query).toArray(function(error, results) { // 3
				if (error) callback(error)
				else callback(null, results)
			});
		}
	});
};

// This line declares the exposed, or exported, entities to other applications that list collectionDriver.js as a required module.
exports.CollectionDriver = CollectionDriver;
