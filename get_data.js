var args = {};
var artistList = []; //list of saved artist ids and their frequencies
var seedArtist = ""; //seed artist to start network from
var relatedNum = 5; //number of related artists per artist to use
var depth = 10; //number of related artist levels to go from seedArtist
var foundArtistID = "";
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

function fetchRelatedArtists(artistId, callback) {
    var url = 'https://api.spotify.com/v1/artists/' + artistId + '/related-artists';
    callSpotify(url, {}, callback);
}

function fetchArtist(artistId, callback) {
    var url = 'https://api.spotify.com/v1/artists/' + artistId;
    callSpotify(url, {}, callback);
}

function searchSpotifyArtist(query, callback) {
    var url = 'https://api.spotify.com/v1/search?query=' + encodeURIComponent(query)
                + "&offset=0&limit=20&type=artist";
    callSpotify(url, {}, callback);
}

function callSpotify(url, data, callback) {
    $.ajax({
        url: url,
        dataType: 'json',
        data: data,
        success: function(r) {
            callback(r);
        },
        statusCode: {
            429: function(r) {
                var retryAfter = r.getResponseHeader('Retry-After');
                retryAfter = parseInt(retryAfter, 10);
                console.log("TMR, Retry-After: " + retryAfter);
                if(!retryAfter) { 
                    retryAfter = 5;
                    console.log("retrying");
                }
                setTimeout(callSpotify(url, data, callback), 3600);
            },
            502: function(r) {
                console.log("five oh two");
                setTimeout(callSpotify(url, data, callback), 36000);
            }
        }
    });
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

function getRelatedArtists(id, relNum) {
    return "";
}

function buildNetwork(seed, relNum, d) {
    

}   

function createNode(id, level) {
    console.log("createnode: " + id);
    
    node = fetchArtist(id, function(r) {
        nodeData(r, id, level);
    });
    return node;
}

function nodeData(r, id, level) {
    var node = {id: id, name: "", related: null, genres: null, popularity: 0, followers: 0, depth: level};
    if(r != null) {
            console.log(r);
            node.name = r.name;
            node.genres = r.genres;
            node.popularity = r.popularity;
            node.followers = r.followers.total;
            node.related = fetchRelatedArtists(id, function(r) {
                sliceRelated(r, relatedNum, level + 1);
            });
        }
}

function sliceRelated(rArray, relNum, level) {
    new_array = [];
    for (var i = 0; i < relNum && i < rArray.artists.length; i++) {
        new_array[i] = {id: rArray.artist[i].id, level: level};
    }
    return new_array;
}





$(document).ready(
    function() {
        args = parseArgs();
        console.log(args);
        if(args["seedArtist"] != "") {
            seedArtist = args["seedArtist"];
            if(args["relatedNum"] != "" && args["depth"] != "") {
                relatedNum = args["relatedNum"];
                depth = args["depth"];
                if(relatedNum > 0 && depth > 0) {
                    searchSpotifyArtist(seedArtist, function(r) {
                        console.log(r);
                        if(r == null || r.artists.length == 0) {
                            //error
                            console.log("no artist found");
                        } else {
                            $("#input").hide();
                            foundArtistID = r.artists.items[0].id;
                            k = createNode(foundArtistID, 0);
                            console.log("gfsd" + k.name);
                            $("#seedName").text(k.name + "yo");
                        }
                    });
                    // buildNetwork(artistId, relatedNum, depth);
                }
            }
        }
    }
);