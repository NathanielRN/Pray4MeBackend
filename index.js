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

// var mongoHost = 'localHost'; //A
// var mongoPort = 27017;
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
app.get('/:firstParameter', function(req, res) { //A
   var params = req.params; //B
   var query = req.query.query; // req.query gets the whole "query" part at the end of the URL and adding .query indicates a query to be perform on this "query" part of the request
   if (query) {
	   query = JSON.parse(query);
	   collectionDriver.query(req.params.firstParameter, query, returnCollectionResults(req, res));
   } else {
	   collectionDriver.findAll(req.params.firstParameter, returnCollectionResults(req, res));
   }
});

function returnCollectionResults(req,res) {
return function(error, objs) { // 5
		if (error) {
		res.send(400, error); } //D
		else {
			if (req.accepts('html')) { //E
					res.render('data',{objects: objs, collection: req.params.collection}); //F //This is not ideal I want to see all the req params tbh
			} else {
				res.set('Content-Type','application/json'); //G
				res.send(200, objs); //H
			}
		}
	};
};

app.get('/:firstParameter/:secondParameter/:thirdParameter?', function(req, res) { //I
   var params = req.params;
   var firstParameter = params.firstParameter;
   var secondParameter = params.secondParameter;
   var thirdParameter = params.thirdParameter
   var query = req.query.query; // req.query gets the whole "query" part at the end of the URL and adding .query indicates a query to be perform on this "query" part of the request
		var test = req.query;
   if (secondParameter && !thirdParameter) {
       collectionDriver.get(firstParameter, secondParameter, function(error, objs) { //J
          if (error) { res.send(400, error); }
          else { res.send(200, objs); } //K
       });
   } else if (thirdParameter) {
			if (query) {
				query = JSON.parse(query); // Isn't going in here and it's because I'm not giving the query correctly which I got to fix...
				collectionDriver.query(req.params.thirdParameter, query, returnCollectionResults(req, res));
			} else {
				collectionDriver.findAll(req.params.thirdParameter, returnCollectionResults(req, res));
			}
   } else {
      res.send(400, {error: 'bad url', url: req.url});
   }
});

//Post methods
app.post('/:firstParameter/:secondParameter?/:thirdParameter?', function(req, res) { //A
    var object = req.body;
    var firstParameter = req.params.firstParameter;
    var thirdParameter = req.params.thirdParameter
	if (thirdParameter) {
		collectionDriver.save(thirdParameter, object, function(err,docs) {
	              if (err) { res.send(400, err);}
		                else {
		                res.send(201, docs); } //B
				     });
	} else {
		collectionDriver.save(firstParameter, object, function(err,docs) {
			if (err) { res.send(400, err);}
			else { res.send(201, docs); } //B
		});
	}
});
// Update method

app.put('/:firstParameter/:secondParameter', function(req, res) { //A
	    var params = req.params;
	        var secondParameter = params.secondParameter;
		    var firstParameter = params.firstParameter;
		        if (secondParameter) {
			       collectionDriver.update(firstParameter, req.body, secondParameter, function(error, objs) { //B
						if (error) { res.send(400, error); }
						else { res.send(200, objs); } //C
					});
				} else {
					var error = { "message" : "Cannot PUT a whole collection (which is firstParameter)" };
					res.send(400, error);
				}
});

// Delete method

app.delete('/:firstParameter/:secondParameter', function(req, res) { //A
	    var params = req.params;
	        var secondParameter = params.secondParameter;
		    var firstParameter = params.firstParameter;
	        if (secondParameter) {
				collectionDriver.delete(firstParameter, secondParameter, function(error, objs) { //B
					if (error) { res.send(400, error); }
					else { res.send(200, objs); } //C 200 b/c includes the original doc
				});
			} else {
				var error = { "message" : "Cannot DELETE a whole collection (firstParameter)" };
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
