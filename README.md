# SpotifyArtistNetwork

Given a seed artist, generates a network of artists based on their related artists.

Downloads 2 tab separated CSV files when finished:

1. Edge List where each edge is an artist ID

2. Node Attributes: details for each node. Ordering: ID, name, level, popularity, followers, genres x 5


###Parameters:

-seed artist

-number of relative artists to use for each artist/node

-depth of recursion - i.e. how many relate artists of related artists levels to go

-stratified download: if doing a large netowrk, this allows you to download the current data at each level starting from this parameter.
