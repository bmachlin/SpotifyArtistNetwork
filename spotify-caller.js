/*

    Spotify Caller
    Used to communicate with the Spotify API

    by Ben Machlin

*/

function authorizeUser(client_id, redirect_uri) {

    var url = 'https://accounts.spotify.com/authorize?client_id=' + client_id +
        '&response_type=token' +
        '&scope=user-library-read' +
        '&redirect_uri=' + encodeURIComponent(redirect_uri);
    document.location = url;
}


function parseArgs() {
    var hash = location.hash.replace(/#/g, '');
    var all = hash.split('&');
    var args = {};
    _.each(all, function(keyvalue) {
        var kv = keyvalue.split('=');
        var key = kv[0];
        var val = kv[1];
        args[key] = val;
    });
    return args;
}


function callSpotify(url, data, callback, dataType) {
    $.ajax({
        url: url,
        dataType: dataType,
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
                }
                setTimeout(callSpotify(url, data, callback), 3600);
            }
        }
    });
}


function fetchCurrentUserProfile(callback) {
    var url = 'https://api.spotify.com/v1/me';
    callSpotify(url, null, callback);
}


function fetchRelatedArtists(artistId, callback) {
    var url = 'https://api.spotify.com/v1/artists/' + artistId + '/related-artists';
    callSpotify(url, {}, callback);
}


function fetchArtist(artistId, callback) {
    var url = 'https://api.spotify.com/v1/artists/' + artistId;
    callSpotify(url, {}, callback);
}


function searchSpotify(query, type, limit, offset, callback) {
    var url = 'https://api.spotify.com/v1/search?query=' + encodeURIComponent(query)
                + "&offset=" + offset + "&limit=" + limit + "&type=" + type;
    callSpotify(url, {}, callback);
}


function getArtistId(query) {
    searchSpotify(query, "artist", 1, 0, function(r) {
        if(r == null || r.artists.length == 0) {
            //error
            console.log("no artist found");
            return null;
        } else {
            return r.artists.items[0].id;
        }
    });
}

/*returns track ID for a given query*/
function getTrackId(query) {
    searchSpotify(query, "track", 1, 0, function(r) {
        if(r == null || r.tracks.length == 0) {
            //error
            console.log("no track found");
            return null;
        } else {
            return r.tracks.items[0].id;
        }
    });
}

/*returns album ID for a given query*/
function getAlbumId(query) {
    searchSpotify(query, "album", 1, 0, function(r) {
        if(r == null || r.albums.length == 0) {
            //error
            console.log("no album found");
            return null;
        } else {
            return r.albums.items[0].id;
        }
    });
}


function getPlaylistId(query) {
    searchSpotify(query, "playlist", 1, 0, function(r) {
        if(r == null || r.playlists.length == 0) {
            //error
            console.log("no playlist found");
            return null;
        } else {
            return r.playlists.items[0].id;
        }
    });
}

function getId(query, type) {
    searchSpotify(query, type, 1, 0, function(r) {
        if(r == null) {
            //error
            console.log("bad request");
            return null;
        } else {
            if(type === "playlist") {
                if(r.playlist.length > 0) {
                    return r.playlists.items[0].id;
                }
            }
            if(type === "album") {
                if(r.album.length > 0) {
                    return r.albums.items[0].id;
                }
            }
            if(type === "artist") {
                if(r.artist.length > 0) {
                    return r.artists.items[0].id;
                }
            }
            if(type === "track") {
                if(r.track.length > 0) {
                     return r.tracks.items[0].id;
                }
            }
            console.log("no" + type + "found");
            return null;
        }
    });
}

function getRelatedArtists(id, relNum) {
    fetchRelatedArtists(id, function(r) {
        if(r == null || r.artists.length == 0) {
            //error
            console.log("no related artists found");
        } else {
            return r.slice(0, relNum);
        }
    });
}