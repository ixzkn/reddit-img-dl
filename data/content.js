var runningList = {};

function toArray(list) {
	return Array.prototype.slice.call(list);
}

// Called on add-on disable
self.port.on("detach", function() {
	var expandos = toArray(document.querySelectorAll(".redditImgDlExpando"));
	expandos.forEach(function(expando){
		expando.parentNode.removeChild(expando);
	});
});

self.port.on("downloadDone", function(url) {
	var expando = runningList[url];
	expando.classList.remove("redditImgDlExpando-run");
	expando.classList.add("redditImgDlExpando-done");
	delete runningList[url];
});

self.port.on("downloadError", function(url) {
	var expando = runningList[url];
	expando.classList.remove("redditImgDlExpando-run");
	expando.classList.add("redditImgDlExpando-err");
	delete runningList[url];
});

function endsWithAny(str, list) {
	var result = false;
	for(var x=0; x<list.length; x++) {
		result = result || str.endsWith(list[x]);
	}
	return result;
}

function applyToPage()
{
	// look for image links and add DL button
	var links = toArray(document.querySelectorAll("a.title"));
	links.forEach(function(link) {
		if(!endsWithAny(link.href,['jpg','jpeg','png','gif'])) return;
		if(!link.parentNode || !link.parentNode.parentNode) return;
		
		var container = link.parentNode.parentNode;
		var newExpando = document.createElement("div");
		newExpando.className = "redditImgDlExpando expando-button collapsed collapsedExpando";
		newExpando.addEventListener("click",function(evt){
			runningList[link.href] = newExpando;
			newExpando.classList.add("redditImgDlExpando-run");
			self.port.emit("downloadStart",link.href);
		}, false);
		var title = container.querySelector("p.title");
		if(!title) return;
		container.insertBefore(newExpando,title.nextSibling);
	});
}

applyToPage();
