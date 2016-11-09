var args = {};
var artistList = {}; //list of artists and their edges
var XseedArtist = ""; //seed artist to start network from
var XrelatedNum = 5; //number of related artists per artist to use
var Xdepth = 10; //number of related artist levels to go from seedArtist
var XfoundArtistID = "";
var k = jQuery.Deferred();
var node = {};
var seedArtist = "";
var callQueue = [];
var depthList = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
// var node = {id: "", name: "", genres: null, popularity: 0, followers: 0};

function error(msg) {
    info(msg);
}

function info(msg) {
    $("#info").text(msg);
}

function parseArgs() {
    var hash = location.search.replace("?", "");
    var all = hash.split('&');
    var args = {};
    _.each(all, function(keyvalue) {
        var kv = keyvalue.split('=');
        var key = kv[0];
        var val = kv[1];
        args[key] = val;
        console.log(val);
    });
    return args;
}

function getArtistId(query) {
    searchSpotify(query, "artist", function(r) {
        if(r == null || r.artists.length == 0) {
            //error
            console.log("no artist found");
        } else {
            return r.artist[0];
        }
    });
}

function getRelatedArtists(id, relatedNum, level) {
    console.log("getRelatedArtists");
    var rel;
    k = fetchRelatedArtists(id, function(r) {
        if(r != null) {
            rel = sliceRelated(r.artists, relatedNum, level + 1);
        }
    });

    k.done(function() {return rel;});
}


function buildNetwork(id, relatedNum, depth, level) {
    console.log("buildNetwork: " + id);
    console.log("buildNetworkL: " + level);

    depthList[level] += 1;

    fetchArtist(id, function(r) {
        var nD = nodeData(r, id, relatedNum, depth, level);
        nD.done(function() {
            console.log(node.name);
            $("#seedName").text(node.name);
            if(callQueue.length > 0) {
                var next = callQueue.shift();
                buildNetwork(next.id, relatedNum, depth, next.level);
                return false;
            } else {
                console.log("done");
                createJSON();
                return true;
            }
        });
    });
}   

/*if(node.name != "") {
            n = node;
            $("#seedName").text(node.name);
            displayRelated(n.related);
        }*/

function createNode(id, relatedNum, level) {
    console.log("createNode: " + id);

    fetchArtist(id, function(r) {
        return nodeData(r, id, relatedNum, level);
    });
}

function nodeData(r, id, relatedNum, depth, level) {
    // console.log("nodeData: " + id);
    node = {id: id, name: "", related: null, genres: null, popularity: 0, followers: 0, level: level};
    if(r != null) {
        node.name = r.name;
        node.genres = r.genres;
        node.popularity = r.popularity;
        node.followers = r.followers.total;

        // getRelatedArtists
        var rel;
        k = fetchRelatedArtists(id, function(r) {
            if(r != null) {
                rel = sliceRelated(r.artists, relatedNum, level);
            }
        });

        k.done(function() {
            node.related = rel;
            addArtistToNetwork(node);
            if(node.level < depth)
                addToCallQueue(rel);
        });
        return k;
    }
}

function addArtistToNetwork(node) {
    // console.log("addArtistToNetwork");
    if(!artistList.hasOwnProperty(node.id)) {
        artistList[node.id] = node.related;
        artistList[node.id].level = node.level;
        artistList[node.id].name = node.name;
        artistList[node.id].genres = node.genres;
        artistList[node.id].popularity = node.popularity;
        artistList[node.id].followers = node.followers;
    }
}

function sliceRelated(rArray, relatedNum, level) {
    // console.log("sliceRelated");
    new_array = [];
    var limit = (relatedNum < rArray.length) ? relatedNum : rArray.length;

    for (var i = 0; i < limit; i++) {
        new_array[i] = {id: rArray[i].id, rank: i+1, level: level+1, name: rArray[i].name};
    }

    return new_array;
}

function addToCallQueue(rel) {
    // console.log("addToCallQueue");
    for(var i = rel.length-1; i >= 0; i--) {
        if(!artistList.hasOwnProperty(rel[i].id)) {
            callQueue.push(rel[i]);
        }
    }
}

function displayRelated(related) {

    for(var i = 0; i < related.length; i++) {
        console.log(related[i]);
        $("#results").append($("<p></p>").text(related[i]));
    }
}

function beginNetwork(seed, relatedNum, depth) {
    searchSpotify(seed, 'artist', function(r) {
        if(r == null || r.artists.total == 0) {
            //error
            alert("no artist found");
        } else {
            $("#input").hide();
            buildNetwork(r.artists.items[0].id, relatedNum, depth, 0);
        }
    });
}


function createJSON() {
    var json = '{\n\"artists\": [ ';

    _.each(artistList, function(artist) {
        var aString = '{\n';




        aString = aString + '}';
        json = json + aString;
    });

    json = json + '}';
}


$(document).ready(
    function() {
        args = parseArgs();
        console.log(args);
        if(args["seedArtist"] != "") {
            var seed = args["seedArtist"];
            if(args["relatedNum"] != "" && args["depth"] != "") {
                var relatedNum = args["relatedNum"];
                var depth = args["depth"];
                if(relatedNum > 0 && depth > 0) {
                    if(depth > 50)
                        depth = 50;
                    beginNetwork(seed, relatedNum, depth);
                }
            }
        }
    }
);