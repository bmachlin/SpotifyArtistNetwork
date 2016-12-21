var args = {}; //arguments found in url
var artistNetwork = {}; //list of artists and their edges
var csvEdgeList = "";
var csvNodeAttrs = "id\tartist\tlevel\tpopularity\tfollowers\t" +
                        "genre1\tgenre2\tgenre3\tgenre4\tgenre5\n";
var ANsize = 0; //number of nodes
var node = {};
var downloadStart = 2147483647;
var processes = 0;
var currentLevel = 0;
var callQueue = []; //queue that keeps track of which ids still need to be added to the network
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











// adds to the network with the given parameters
function buildNetwork(id, relatedNum, depth, level) {
    processes++;
    // console.log("buildNetwork: " + id);
    // console.log("buildNetwork level: " + level);

    //stratified downloading
    if(currentLevel != level) {
        if(currentLevel >= downloadStart) {
            writeFiles(relatedNum, level-1);
        }
        currentLevel = level;
    }
    
    //get artist data
    var d = fetchArtist(id, function(r) {

        //add the current artist to the network
        var nD = nodeData(r, id, relatedNum, depth, level);
        nD.done(function() {

            //if there are more artists to add, get them from the callqueue
            if(callQueue.length > 0) {
                var next = callQueue.shift();
                buildNetwork(next.id, relatedNum, depth, next.level);
                return false;
            } else {
                //finished getting data
                console.log("done");
                cleanCSV();
                connectivity(relatedNum, depth);
                writeFiles(relatedNum, depth);
                return true;
            }
        });
    });

    //failure: try again
    d.fail(function(jqXHR, textStatus, errorThrown ) {
        console.log("tmr artist");
        buildNetwork(id, relatedNum, depth, level);
    });
}

// sets data for the node being added
function nodeData(r, id, relatedNum, depth, level) {
    processes++;
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

        //success: add related to the callqueue unless artist is at max depth
        k.done(function() {
            node.related = rel;
            if(node.level < depth) {
                addToCallQueue(rel);
                addArtistToNetwork(node, false);
            } else {
                addArtistToNetwork(node, true)
            }
        });

        //failure: try again
        k.fail(function(jq, ts, e) {
            // setTimeout(function(){ buildNetwork(id, relatedNum, depth, level); }, 1000);
        });
        return k;
    }
}


// adds completed node to network data structure and CSVs
function addArtistToNetwork(node, edgeOfGraph) {
    processes++;
    // console.log("addArtistToNetwork");

    if(!artistNetwork.hasOwnProperty(node.id)) {

        //counters and debug
        depthList[node.level] += 1;
        console.log(node.level);
        ANsize++;
        if(ANsize%100 == 0) console.log(ANsize);
        if(ANsize%1000 == 0) $("p").remove();

        addNewArtist(node);

        addNewArtistEdges(node, edgeOfGraph);

        addNewArtistAttributes(node);
    }
}


function addNewArtist(node) {
    //add node attributes
    artistNetwork[node.id] = node.related;
    artistNetwork[node.id].level = node.level;
    artistNetwork[node.id].name = node.name;
    artistNetwork[node.id].genres = node.genres;
    artistNetwork[node.id].popularity = node.popularity;
    artistNetwork[node.id].followers = node.followers;

    var s = "";
    for(var x = 0; x < node.level; x++) {
        s += ".";
    }
    $("#seedName").append($("<p></p>").text(s + node.name));
}


function addNewArtistEdges(node, edgeOfGraph) {
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
}

function addNewArtistAttributes(node) {
    //create CSV note attributes
    var csvNA = node.id + "\t" + node.name + "\t" + node.level + "\t" + 
                node.popularity + "\t" + node.followers;
    for(var i = 0; i < node.genres.length && i < 5; i++) {
        csvNA +=  "\t" + node.genres[i];
    }
    csvNodeAttrs += csvNA + "\n";
}


// modifies related artist results to fit network parameters
function sliceRelated(rArray, relatedNum, level) {
    // console.log("sliceRelated");
    new_array = [];
    var limit = (relatedNum < rArray.length) ? relatedNum : rArray.length;

    for (var i = limit-1; i >= 0; i--) {
        new_array[i] = {id: rArray[i].id, rank: limit - i, level: level+1, name: rArray[i].name};
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
            alert("No artist found");
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

    console.log("nodes: " + total);
    console.log("max nodes:" + maxNodes);
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