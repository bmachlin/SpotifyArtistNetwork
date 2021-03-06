var args = {}; //arguments found in url
var artistNetwork = {}; //list of artists and their edges
var csvEdgeList = "source\ttarget\trank\n";
var csvNodeAttrs = "id\tartist\tlevel\tpopularity\tfollowers\t" +
                        "genre1\tgenre2\tgenre3\tgenre4\tgenre5\n";
var ANsize = 0; //number of nodes
var node = {};
var seedArtist = "";
var downloadStart = 2147483647;
var currentLevel = 0;
var callQueue = []; //queue that keeps track of which ids still need to be added to the network
var errorQueue = [];
var depthList = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 
                 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];

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


//returns first artist found from searching with *query*
function getArtistId(query) {
    // console.log("getArtistID: " + query);
    searchSpotify(query, "artist", function(r) {
        if(r === null || r.artists.length === 0) {
            //error
            console.log("no artist found");
        } else {
            return r.artist[0];
        }
    });
}

// returns first *relatedNum* related artists for *id*
function getRelatedArtists(id, relatedNum, level) {
    // console.log("getRelatedArtists");
    var rel;
    var k = fetchRelatedArtists(id, function(r) {
        if(r != null) {
            rel = sliceRelated(r.artists, relatedNum, level + 1);
        }
    });

    k.done(function() {return rel;});
}

// creates a network with the given parameters
function buildNetwork(id, relatedNum, depth, level) {
    // console.log("buildNetwork: " + id);
    // console.log("buildNetwork level: " + level);
    if(currentLevel != level) {
        if(currentLevel >= downloadStart) {
            writeFiles(relatedNum, level-1);
        }
        currentLevel = level;
    }
    

    var d = fetchArtist(id, function(r) {
        var nD = nodeData(r, id, relatedNum, depth, level);
        nD.done(function() {
            // console.log(node.name);
            var s = "";
            for(var x = 0; x < level; x++) {
                s += ".";
            }
            $("#seedName").append($("<p></p>").text(s + node.name));
            // if(errorQueue.length > 0) {
            //     var next = errorQueue.shift();
            //     buildNetwork(next.id, relatedNum, depth, next.level);
            /*}else*/ if(callQueue.length > 0) {
                var next = callQueue.shift();
                buildNetwork(next.id, relatedNum, depth, next.level);
                return false;
            } else {
                console.log("done");
                cleanCSV();
                connectivity(relatedNum, depth);
                writeFiles(relatedNum, depth);
                return true;
            }
        });
    });

    d.fail(function(jqXHR, textStatus, errorThrown ) {
        var e = errorThrown;
        console.log(e);
        // errorQueue.push({id: id, level: level});
        buildNetwork(id, relatedNum, depth, level);
    });
}   

// given artist id, relatedNum and current level, creates a new node in the network
function createNode(id, relatedNum, level) {
    // console.log("createNode: " + id);
    // console.log("createNode: " + id);

    fetchArtist(id, function(r) {
        return nodeData(r, id, relatedNum, level);
    });
}

// sets data for the node being added
function nodeData(r, id, relatedNum, depth, level) {
    // console.log("nodeData: " + id);
    node = {id: id, name: "", related: null, genres: null, 
            popularity: 0, followers: 0, level: level};
    if(r != null) {
        node.name = r.name;
        node.genres = r.genres;
        node.popularity = r.popularity;
        node.followers = r.followers.total;

        // getRelatedArtists
        var rel;
        var k = fetchRelatedArtists(id, function(r) {
            if(r != null) {
                rel = sliceRelated(r.artists, relatedNum, level);
            }
        });

        k.done(function() {
            node.related = rel;
            if(node.level < depth) {
                addToCallQueue(rel);
                addArtistToNetwork(node, false);
            } else {
                addArtistToNetwork(node, true)
            }
        });
        k.fail(function(jq, ts, e) {
            // errorQueue.push({node});
            buildNetwork(id, relatedNum, depth, level);
        });
        return k;
    }
}

// adds completed node to network data structure
function addArtistToNetwork(node, edgeOfGraph) {
    // console.log("addArtistToNetwork");
    if(!artistNetwork.hasOwnProperty(node.id)) {

        //update counters
        depthList[node.level] += 1;
        console.log(node.level);
        ANsize++;
        if(ANsize%100 == 0) console.log(ANsize);
        if(ANsize%1000 == 0) $("p").remove();


        //set node attributes
        artistNetwork[node.id] = node.related;
        artistNetwork[node.id].level = node.level;
        artistNetwork[node.id].name = node.name;
        artistNetwork[node.id].genres = node.genres;
        artistNetwork[node.id].popularity = node.popularity;
        artistNetwork[node.id].followers = node.followers;

        //create CSV edges
        if(!edgeOfGraph) {
            for(var i = 0; i < node.related.length; i++) {
                csvEdgeList +=  node.id + "\t" + node.related[i].id + "\t" + node.related[i].rank + "\n";
            }   
        } else {
            //if node is a leaf, only add edges to nodes that already exist
            for(var i = 0; i < node.related.length; i++) {
                if(artistNetwork.hasOwnProperty(node.related[i])) {
                    csvEdgeList +=  node.id + "\t" + node.related[i].id + "\t" + node.related[i].rank + "\n";
                }
            }
        }

        //create CSV note attributes
        var csvNA = node.id + "\t" + node.name + "\t" + node.level + "\t" + 
                    node.popularity + "\t" + node.followers;
        for(var i = 0; i < node.genres.length && i < 5; i++) {
            csvNA +=  "\t" + node.genres[i];
        }
        csvNodeAttrs += csvNA + "\n";
    }
}

// modifies related artist results to fit network parameters
function sliceRelated(rArray, relatedNum, level) {
    // console.log("sliceRelated");
    new_array = [];
    var limit = (relatedNum < rArray.length) ? relatedNum : rArray.length;

    for (var i = 0; i < limit; i++) {
        new_array[i] = {id: rArray[i].id, rank: i+1, level: level+1, name: rArray[i].name};
    }

    return new_array;
}

// keeps track of which nodes to get edges/related artists for
function addToCallQueue(rel) {
    // console.log("addToCallQueue");
    for(var i = rel.length-1; i >= 0; i--) {
        if(!artistNetwork.hasOwnProperty(rel[i].id)) {
            callQueue.push(rel[i]);
        }
    }
}

function writeFiles(relatedNum, depth) {
    download(csvEdgeList, "SAN-" + args["seedArtist"] + "-" + relatedNum + 
                            "-" + depth + "-EL.csv", "text/plain");
    download(csvNodeAttrs, "SAN-" + args["seedArtist"] + "-" + relatedNum + 
                            "-" + depth + "-NA.csv", "text/plain");
}

// Function to download data to a file
function download(data, filename, type) {
    var a = document.createElement("a"),
        file = new Blob([data], {type: type});
    if (window.navigator.msSaveOrOpenBlob) // IE10+
        window.navigator.msSaveOrOpenBlob(file, filename);
    else { // Others
        var url = URL.createObjectURL(file);
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        setTimeout(function() {
            document.body.removeChild(a);
            window.URL.revokeObjectURL(url);  
        }, 0); 
    }
}

// setting up network data
function beginNetwork(seed, relatedNum, depth) {
    searchSpotify(seed, 'artist', function(r) {
        if(r === null || r.artists.total === 0) {
            //error
            alert("no artist found");
        } else {
            $("#input").hide();
            buildNetwork(r.artists.items[0].id, relatedNum, depth, 0);
        }
    });
}

function cleanCSV() {
    csvNodeAttrs = csvNodeAttrs.replace(/[^\w\s.,'&]/g, "");
}

function connectivity(relatedNum, depth) {
    var maxNodes = 0;
    for(var j = 0; j <= depth; j++) {
        maxNodes += Math.pow(relatedNum, j);    
    }
    var total = 0;
    for(var i = 0; i < depthList.length; i++) {
        total += depthList[i];
    }
    console.log(total);
    console.log(maxNodes);
    console.log(total/maxNodes);

    return total/maxNodes;
}


$(document).ready(
    function() {
        args = parseArgs();
        console.log(args);
        if(args.hasOwnProperty("download")) {
            downloadStart = parseInt(args["download"]);
        }
        if(args["seedArtist"] != "") {
            var seed = args["seedArtist"];
            if(args["relatedNum"] != "" && args["depth"] != "") {
                var relatedNum = parseInt(args["relatedNum"]);
                var depth = parseInt(args["depth"]);
                if(relatedNum > 0 && depth > 0) {
                    if(depth > 50)
                        depth = 50;
                    beginNetwork(seed, relatedNum, depth);
                }
            }
        }
    }
);