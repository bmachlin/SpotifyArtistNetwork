var args = {};
var rCount = 0; //length of relatedList
var aCount = 0; //length of artistList
var artistList = {}; //list of saved artist ids and their frequencies
var relatedList = {}; //list of related artist ids and their frequencies
var idNames = {}; //index is artist ID, value is artist name as a string
var GseedArtist = ""; //seed artist to start network from
var GrelatedNum = 5; //number of related artists per artist to use
var Gdepth = 10; //number of related artist levels to go from seed

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

function callSpotify(url, data, callback) {
    $.ajax({
        url: url,
        dataType: 'json',
        data: data,
        // headers: {
        //     'Authorization': 'Bearer ' + accessToken
        // },
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

function buildNetwork(id, relatedNum, depth) {
    
    fetchRelatedArtists(id, function(rels) {
        if(rels == null) {
            console.log("tmr related");
            //check Retry-After header
        }

        for(var i = 0; i < relatedNum && i < rels.artists.length; i++) {

            var j = 0;
            
            for(; j < idVal; j++) {
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
        }
    });
}

function displayLists() {
    //calculate top X related artists
    //display artist names and frequencies
    relOrder.sort(function(a, b) {
        //console.log("r[" + a + "] = " + relatedList[a] + "- r[" + b + "] = " + relatedList[b]);
        return relatedList[b] - relatedList[a];
    });
    artOrder.sort(function(a, b) {
        return artistList[b] - artistList[a];
    });

    var Rlist = $("#related-list");
    var Alist = $("#artist-list");
    $("#main").show();
    $("#intro").hide();
    $("#artist-list").empty();
    Alist.append($("<h2>").text("ARTISTS"));
    info("");

    for(var i = 0; i < artOrder.length; i++) {
        var id = artOrder[i];
        var name = idNames[id];
        var freq = artistList[id];
        // console.log("ID: " + id + " Name: " + name + " Count: " + freq);
        if(freq != null && freq > 1) {
            var itemElement = $("<div>").text(name + " - " + freq);
            Alist.append(itemElement);
        }
    }

    $("#related-list").empty();
    Rlist.append($("<h2>").text("RELATED"));
    info("");

    for(var i = 0; i < relOrder.length; i++) {
        var id = relOrder[i];
        var name = idNames[id];
        var freq = relatedList[id];
        //console.log("ID: " + id + " Name: " + name);
        if(freq != null && freq > 1) {
            var itemElement = $("<div>").text(name + " - " + freq);
            Rlist.append(itemElement);
        }
    }
}



$(document).ready(
    function() {
        args = parseArgs();
        console.log(args);
        if(args["seedArtist"] != "") {
            seedArtist = args["seedArtist"];
            if(args["relatedNum"] != "" && args["depth"] != "") {
                GrelatedNum = args["relatedNum"];
                Gdepth = args["depth"];
                if(GrelatedNum > 0 && Gdepth > 0) {
                    var artistId = getArtistId(seedArtist);
                    if(artistId != "") {
                        buildNetwork(artistId, GrelatedNum, dGnepth);
                    }
                }
            }
        }
    }
);