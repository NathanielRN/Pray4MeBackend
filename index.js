//1
var http = require('http'),
	express = require('express'),
	path = require('path'),
	MongoClient = require('mongodb').MongoClient,
	Server = require('mongodb').Server,
	CollectionDriver = require('./collectionDriver').CollectionDriver;
	FileDriver = require('./fileDriver').FileDriver,
	dotenv = require('dotenv');

//Set up dotenv to securely access credentials

dotenv.config();

// 1.5 ?
var app = express();
app.set('port', process.env.PORT || 3000);
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jade');

//Parse the incoming object to a JSON object. By putting this call first, the body parsing will be called before the other route handlers. This way req.body can be passed directly to the driver code as a JavaScript object.

app.use(express.bodyParser());

// Mongo Host

var mongoHost = 'localHost'; //A
var mongoPort = 27017;
var mongoURL = process.env.MONGOLAB_URI;
var collectionDriver;
var fileDriver;

var mongoClient = new MongoClient(); //B
mongoClient.connect(mongoURL, function (err, db) {
  if (err) {
    console.log('Unable to connect to the mongoDB server. Error:', err);
  } else {
    console.log('Connection established to', mongoURL);

// do some work here with the database.
	var db = db;  //E
	db.databaseName = 'MyDatabase';
	fileDriver = new FileDriver(db);
	collectionDriver = new CollectionDriver(db); //F
	//Close connection
	//db.close();
}
});




// var mongoClient = new MongoClient(new Server(mongoHost, mongoPort)); //B
// mongoClient.open(function(err, mongoClient) { //C
//   if (!mongoClient) {
//       // console.error("Error! Exiting... Must start MongoDB first");
//       // process.exit(1); //D
//       console.log("Remember you turned off the check for mongoDB bc heroku requires it")
//   }
//   var db = mongoClient.db("MyDatabase");  //E
//   fileDriver = new FileDriver(db);
//   collectionDriver = new CollectionDriver(db); //F
// });

// Access a public folder from root directory '/' Using the static handler, anything in /public can now be accessed by name. e.g. http://localhost:3000/hello.html where hello.html is inside /public
app.use(express.static(path.join(__dirname, 'public')));

// Generic response from root directory
app.get('/', function(req, res) {
	res.send('<html><body><h1>Hello World</h1></body></html>');
});

// Putting this before the generic /:collection routing means that the keyword 'files' in this specific path format are treated differently than a generic files collection.
app.post('/files', function(req, res) {fileDriver.handleUploadRequest(req, res);});
app.get('/files/:id', function(req, res) {fileDriver.handleGet(req, res);});

// The / is the base. The : means this HAS to be included AND means it's a placeholder for the actual path!. But putting a ? means it can or cannot be added with no problem.
app.get('/:collection', function(req, res) { //A
   var params = req.params; //B
   var query = req.query.query; // req.query gets the whole "query" part at the end of the URL and adding .query indicates a query to be perform on this "query" part of the request
   if (query) {
	   query = JSON.parse(query);
	   collectionDriver.query(req.params.collection, query, returnCollectionResults(req, res));
   } else {
	   collectionDriver.findAll(req.params.collection, returnCollectionResults(req, res));
   }
});

function returnCollectionResults(req,res) {
	return function(error, objs) { // 5
if (error) { res.send(400, error); } //D
	      else {
	          if (req.accepts('html')) { //E
    	          res.render('data',{objects: objs, collection: req.params.collection}); //F
              } else {
	          res.set('Content-Type','application/json'); //G
                  res.send(200, objs); //H
              }
         }
   	};
};

app.get('/:collection/:entity', function(req, res) { //I
   var params = req.params;
   var entity = params.entity;
   var collection = params.collection;
   if (entity) {
       collectionDriver.get(collection, entity, function(error, objs) { //J
          if (error) { res.send(400, error); }
          else { res.send(200, objs); } //K
       });
   } else {
      res.send(400, {error: 'bad url', url: req.url});
   }
});

//Post methods
app.post('/:collection', function(req, res) { //A
	    var object = req.body;
	        var collection = req.params.collection;
		    collectionDriver.save(collection, object, function(err,docs) {
			              if (err) { res.send(400, err);}
				                else { res.send(201, docs); } //B
						     });
});
// Update method

app.put('/:collection/:entity', function(req, res) { //A
	    var params = req.params;
	        var entity = params.entity;
		    var collection = params.collection;
		        if (entity) {
				       collectionDriver.update(collection, req.body, entity, function(error, objs) { //B
					                 if (error) { res.send(400, error); }
							           else { res.send(200, objs); } //C
								          });
				          } else {
						         var error = { "message" : "Cannot PUT a whole collection" };
							        res.send(400, error);
								   }
});

// Delete method

app.delete('/:collection/:entity', function(req, res) { //A
	    var params = req.params;
	        var entity = params.entity;
		    var collection = params.collection;
		        if (entity) {
				       collectionDriver.delete(collection, entity, function(error, objs) { //B
					                 if (error) { res.send(400, error); }
							           else { res.send(200, objs); } //C 200 b/c includes the original doc
								          });
				          } else {
						         var error = { "message" : "Cannot DELETE a whole collection" };
							        res.send(400, error);
								   }
});
//2

//Since the route handlers are added in the order they are set with app.use or app.verb, a catch-all can be added at the end of the route chain.

app.use(function (req,res) { //1
    res.render('404', {url:req.url}); //2
});

http.createServer(app).listen(app.get('port'), function(){
  console.log('Express server listening on port ' + app.get('port'));
});
