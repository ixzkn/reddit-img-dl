var pageMod = require("sdk/page-mod");
var self = require("sdk/self");
var prefs = require('sdk/simple-prefs');
var file = require('sdk/io/file');
var xhr = require("sdk/net/xhr");
var url = require('sdk/url');

var workers = [];
var saveDir = prefs.prefs['saveDir'];

function detachWorker(worker) {
  var index = workers.indexOf(worker);
  if(index != -1) {
    workers.splice(index, 1);
  }
}

function broadcastWorkers(type, message) {
	for each(var work in workers) {
		work.port.emit(type, message);
	}
}

function doRequest(inurl, ok, error){
	// sanitize input to XHR
	if(!inurl.startsWith("http://") &&
	   !inurl.startsWith("https://")) {
	   	console.error("Invalid URL");
	   	error();
		return;
	}

	var request = xhr.XMLHttpRequest();
	request.open("GET", inurl);

	// Note: we cant use ArrayBuffer response because the io/file API wrongly
	//  takes a string on the write method of a ByteWriter
	request.overrideMimeType('text\/plain; charset=x-user-defined');
	request.onload = function() {
		try{
			if(request.status == 200) {
			 	if (request.response) {
			 		ok(request.responseText);
			 	}
		 	} else {
		 		console.error("Failed request");
		 		error();
		 	}
	 	}catch(err) {
	 		console.error(err);
	 		error();
	 	}
	};
	request.onerror = function(){
		console.error("XHR error");
		error();
	};
	request.send(null);
}

function doSave(arrayBuffer, filename, ok, error) {
	var fullpath = file.join(saveDir,filename);
	if(file.exists(fullpath) || !file.exists(saveDir)) {
		console.error("Exists?: "+fullpath);
		error();
		return;
	}
	var str = file.open(fullpath,"wb");
	if(!str){
		console.error("Failed to open: "+fullpath);
		error();
		return;
	}
    str.write(arrayBuffer);
	str.close();
	ok();
}

prefs.on("saveDir", function(name){
	saveDir = prefs.prefs['saveDir'];
});

pageMod.PageMod({
  include: "*.reddit.com",
  contentScriptWhen: "ready",
  contentScriptFile: "./content.js",
  contentStyleFile: "./content.css",
  onAttach: function(worker) {
  	// maintain a list of workers
  	workers.push(worker);
    worker.port.on('detach', function () {
      detachWorker(this);
    });
    worker.port.on("downloadStart",function(inurl){
    	// downlaod url and save as new file with same basename to saveDir
    	try{
	    	doRequest(inurl, function(response) {
	    		var path = url.URL(inurl).path;
	    		var filename = path.slice(path.lastIndexOf('/')+1);
	    		// TODO: should we try to sanitize the filename more??
	    		doSave(response,filename,function(){
	    			worker.port.emit("downloadDone", inurl);
	    		},function(){
	    			worker.port.emit("downloadError",inurl);
	    		});
	    	}, function() {    			
	    		worker.port.emit("downloadError",inurl);
	    	});
	    }catch(err){
	    	console.error(err);
	    	worker.port.emit("downloadError",inurl);
	    }
    });
  }
});
