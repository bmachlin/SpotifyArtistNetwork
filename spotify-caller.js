/*

    Spotify Caller
    Used to communicate with the Spotify API

    by Ben Machlin

*/



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
        } else {
            return r.artists.items[0].id;
        }
    });
}

function getTrackId(query) {
    searchSpotify(query, "track", 1, 0, function(r) {
        if(r == null || r.tracks.length == 0) {
            //error
            console.log("no artist found");
        } else {
            return r.tracks.items[0].id;
        }
    });
}


function getAlbumId(query) {
    searchSpotify(query, "album", 1, 0, function(r) {
        if(r == null || r.albums.length == 0) {
            //error
            console.log("no artist found");
        } else {
            return r.albums.items[0].id;
        }
    });
}


function getPlaylistId(query) {
    searchSpotify(query, "playlist", 1, 0, function(r) {
        if(r == null || r.playlists.length == 0) {
            //error
            console.log("no artist found");
        } else {
            return r.playlists.items[0].id;
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