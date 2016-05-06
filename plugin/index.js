console.log("hello fennec!!")
console.error("error fennecsssssss!")

var self = require("sdk/self");
var prefsvc = require("sdk/preferences/service");
var { MatchPattern } = require("sdk/util/match-pattern");
var Request = require("sdk/request").Request;
const file = require('sdk/io/file');
var base64 = require("sdk/base64");
var cached = new Set();
var fileIO = require("sdk/io/file");
var dtnip = "";
let {Cc, Ci, CC, Cu} = require('chrome');

function HttpObserver() {}

HttpObserver.prototype.observerService = Cc["@mozilla.org/observer-service;1"].getService(Ci.nsIObserverService);
var cacheService = Cc["@mozilla.org/netwerk/cache-storage-service;1"].getService(Ci.nsICacheStorageService);
var BinaryInputStream = CC('@mozilla.org/binaryinputstream;1', 'nsIBinaryInputStream', 'setInputStream');
var BinaryOutputStream = CC('@mozilla.org/binaryoutputstream;1', 'nsIBinaryOutputStream', 'setOutputStream');
var StorageStream = CC('@mozilla.org/storagestream;1', 'nsIStorageStream', 'init');
let {LoadContextInfo} = Cu.import(
"resource://gre/modules/LoadContextInfo.jsm", {}
);
var ios = Cc["@mozilla.org/network/io-service;1"].getService(Ci.nsIIOService);
var { setInterval } = require("sdk/timers");

/** Initialisation and termination functions */
HttpObserver.prototype.start = function() {
	this.observerService.addObserver(this, "http-on-modify-request", false);
	this.observerService.addObserver(this, "http-on-examine-response", false);
	console.log("service started!!!")

    setInterval(function() {
        var text = null;
		var filename = "/mnt/sdcard/ip.txt"
        if (fileIO.exists(filename)) {
            var TextReader = fileIO.open(filename, "r");
            if (!TextReader.closed) {
            dtnip = TextReader.read();
            TextReader.close();
            }
        }
    }, 5000)
};

function readTextFromFile(filename) {
  

  return text;
}



/** Stop listening, ignore errors */
HttpObserver.prototype.stop = function() {
	try {
		this.observerService.removeObserver(this, "http-on-examine-response");
		this.observerService.removeObserver(this, "http-on-modify-request");
	} catch (e) {
		console.log("Failed to remove observer", e);
	}
};



function TracingListener() {
	this.receivedChunks = []; // array for incoming data. holds chunks as they come, onStopRequest we join these junks to get the full source
	this.responseBody; // we'll set this to the 
	this.responseStatusCode;

	this.deferredDone = {
		promise: null,
		resolve: null,
		reject: null
	};
	this.deferredDone.promise = new Promise(function(resolve, reject) {
		this.resolve = resolve;
		this.reject = reject;
	}.bind(this.deferredDone));
	Object.freeze(this.deferredDone);
	this.promiseDone = this.deferredDone.promise;
}
TracingListener.prototype = {
	onDataAvailable: function(aRequest, aContext, aInputStream, aOffset, aCount) {
		var iStream = new BinaryInputStream(aInputStream) // binaryaInputStream
		var sStream = new StorageStream(8192, aCount, null); // storageStream // not sure why its 8192 but thats how eveyrone is doing it, we should ask why
		var oStream = new BinaryOutputStream(sStream.getOutputStream(0)); // binaryOutputStream

		// Copy received data as they come.
		var data = iStream.readBytes(aCount);
		this.receivedChunks.push(data);

		oStream.writeBytes(data, aCount);
        console.log(aCount);
		this.originalListener.onDataAvailable(aRequest, aContext, sStream.newInputStream(0), aOffset, aCount);
	},
	onStartRequest: function(aRequest, aContext) {
		this.originalListener.onStartRequest(aRequest, aContext);
	},
	onStopRequest: function(aRequest, aContext, aStatusCode) {
		console.log(this.receivedChunks.length)
		this.responseBody = this.receivedChunks.join("");
		delete this.receivedChunks;
		console.log(this.responseBody.length);
		this.responseStatus = aStatusCode;
		this.originalListener.onStopRequest(aRequest, aContext, aStatusCode);

		this.deferredDone.resolve();
	},
	QueryInterface: function(aIID) {
		if (aIID.equals(Ci.nsIStreamListener) || aIID.equals(Ci.nsISupports)) {
			return this;
		}
		throw Cr.NS_NOINTERFACE;
	}
};


HttpObserver.prototype.observe = function(subject, topic, data) {
	// HTTP Channel
	var chan = subject.QueryInterface(Ci.nsIHttpChannel);
	var imagepattern = new RegExp(".*/geoserver/i/([\\d]+)/([\\d]+)/([\\d]+)$");
	var vectorpattern = new RegExp(".*/geoserver/v/([\\d]+)/([\\d]+)/([\\d]+)$");
	var trafficpattern = new RegExp(".*/geoserver/t/([\\d]+)/([\\d]+)/([\\d]+)$");
	var serverhp = "166.111.68.197:11193";
	var uri = subject.URI.asciiSpec;
	
	switch (topic) {
		case 'http-on-modify-request':
			var isserver;
			var reqhp = subject.URI.hostPort;
			if(reqhp === serverhp)
		    {
				isserver = 1;
			}
			else
			{
				isserver = 0;
			}
			
			if(isserver && (imagepattern.test(uri) || vectorpattern.test(uri) || trafficpattern.test(uri)))
			{
				var storage = cacheService.diskCacheStorage(
								LoadContextInfo.default,
								false
							);
				var result = storage.asyncOpenURI(
					subject.URI,
					null,
					Ci.nsICacheStorage.OPEN_READONLY,
					{
						onCacheEntryCheck: function (entry, appcache) {
						return Ci.nsICacheEntryOpenCallback.ENTRY_WANTED;
						},
					onCacheEntryAvailable: function (entry, isnew, appcache, status) {
					if(entry === null)
					{
						var dtnuri = "http://" + dtnip + subject.URI.path;
						var dtnreq = Request({
						url: dtnuri,
						onComplete: function (response) {
						if(cached.has(subject.URI.path)){
							cached.delete(subject.URI.path);
						}
						   
						}}
						);
						dtnreq.get();
						cached.add(subject.URI.path);
					}
						
					}
						}
				);
				    
			}	
			break;
		case 'http-on-examine-response':
			var isserver;
			var reqhp = subject.URI.hostPort;
			if(reqhp === serverhp)
		    {
				isserver = 1;
			}
			else
			{
				isserver = 0;
			}
			
			if(isserver && (imagepattern.test(uri) || vectorpattern.test(uri) || trafficpattern.test(uri)))
			{

				var newListener = new TracingListener();
				subject.QueryInterface(Ci.nsITraceableChannel);
				newListener.originalListener = subject.setNewListener(newListener);
				newListener.promiseDone.then(
				function() {
					// no error happened
					//console.log('yay response done:', newListener.responseBody);
					if(cached.has(subject.URI.path)){
						var dtnip = "http://172.16.0.8";
					console.log(dtnip);
					var dtnuri = dtnip + subject.URI.path;
					var dtnpost = Request({
						url: dtnuri,
						content: base64.encode(newListener.responseBody),
						//contentType: "application/octet-stream;charset=binary",
						//overrideMimeType: "text/plain; charset=latin1",
						//onComplete: function (response) {
						//console.log(response.text);
						}
					);
					dtnpost.post();
					cached.delete(subject.URI.path);
					}
				},
				function(aReason) {
					// promise was rejected, right now i didnt set up rejection, but i should listen to on abort or bade status code then reject maybe
				}
				).catch(
				function(aCatch) {
					console.error('something went wrong, a typo by dev probably:', aCatch);
				}
			);
				}
			
		    /*var isserver;
			var reqhp = subject.URI.hostPort;
			if(reqhp === serverhp)
		    {
				isserver = 1;
			}
			else
			{
				isserver = 0;
			}
			
			if(isserver && (imagepattern.test(uri) || vectorpattern.test(uri) || trafficpattern.test(uri)))
			{
				console.log(subject.data);
				//this.onResponse(subject);
			}
			break;
		default:
			break;*/
	}
};



HttpObserver.prototype.QueryInterface = function(iid) {
	if (!iid.equals(Components.interfaces.nsISupports) &&
		!iid.equals(Components.interfaces.nsIHttpNotify) &&
		!iid.equals(Components.interfaces.nsIObserver)) {
		throw Components.results.NS_ERROR_NO_INTERFACE;
	}
	return this;
};

var httpobserver = new HttpObserver();
httpobserver.start();
// a dummy function, to show how tests work.
// to see how to test this function, look at test/test-index.js
//function dummy(text, callback) {
//  callback(text);
//}

//exports.dummy = dummy;
