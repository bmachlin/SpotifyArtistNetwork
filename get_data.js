var args = {};
var rCount = 0; //length of relatedList
var aCount = 0; //length of artistList
var artistList = {}; //list of saved artist ids and their frequencies
var relatedList = {}; //list of related artist ids and their frequencies
var idNames = {}; //index is artist ID, value is artist name as a string
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
    return "";
}

function getRelatedArtists(id, number) {
    return "";
}

function buildNetwork(artistList) {
    /*
        given a list of artistNodes, build the network
    */
    
    fetchRelatedArtists(id, function(rels) {
        if(rels == null) {
            console.log("tmr related");
            //check Retry-After header
        }

        for(var i = 0; i < relatedNum && i < rels.artists.length; i++) {

            var j = 0;
                var rID = rels.artists[i].id;

                if(relatedList[rID] != null) {
                    relatedList[rID] += 1;
                } else {
                    rCount++;
                    idNames[rID] = rels.artists[i].name;
                    relatedList[rID] = 1;
                    relOrder.push(rID);
                }
        }
    });

}   

function createNode(id) {
    console.log("createnode: " + id);
    var node = {id: id, name: "", related: null, genres: null, popularity: 0, followers: 0};
    fetchArtist(id, function(r) {
        if(r != null) {
            console.log(r);
            node.name = r.name;
            node.genres = r.genres;
            node.popularity = r.popularity;
            node.followers = r.followers.total;
            fetchRelatedArtists(id, function(r) {
                if(r != null) {
                    node.related = sliceRelated(r.artists, relatedNum);
                }
            });
        }
    });
    
    return node;
}

function sliceRelated(array, relNum) {
    new_array = [];
    for (var i = 0; i < relNum && i < array.length; i++) {
        new_array[i] = array[i].id;
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
                    var artistId = getArtistId(seedArtist);
                    if(artistId != "" || artistId == "") {
                        searchSpotifyArtist(seedArtist, function(r) {
                            console.log(r);
                            foundArtistID = r.artists.items[0].id;
                            console.log(foundArtistID);
                            k = createNode(foundArtistID);
                        });
                        // buildNetwork(artistId, relatedNum, depth);
                    }
                }
            }
        }
    }
);