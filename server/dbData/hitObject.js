/*
 *
 *  Code created by Rico Fritzsche and Simon Sander 2015
 *  Copyright SAM [Rico Fritzsche, Christoph Prinz, Simon Sander]
 *
 */

Array.prototype.contains = function(obj) {
    var i = this.length;
    while (i--) {
        if (this[i] === obj) {
            return true;
        }
    }
    return false;
};

function Hits() {
    this.isHit = true;
    this.trackIDs = [];
    this.hitIDs = [];

    this.relationIDs  = [];
}

/*
 * Decides weather a track can get an existing hitID or need a new one. Therefore for each routes with same tracks
 * exist a list with all tracks which belong together.
 * param:   isHit, newTrackIDs, newHItIDs
 * ret:     true or falls (isContaining)
 */
Hits.prototype.updateHits = function(isHit, newTrackIDs, newHItIDs){
    var that = this;

    // change only weather is true
    if (this.isHit){
        this.isHit = isHit;
    }

    // add trackIDs or search for the same values in trackID-list
    if (newTrackIDs != null) {
        if (this.trackIDs.length == 0) {
            newTrackIDs.forEach(function (trackID) {
                if (trackID != null) {
                    //console.log("add trackID: ", trackID);
                    that.trackIDs.push(trackID);
                }
            });
        } else {
            that.trackIDs.filter(function (value) {
                var isContaining = newTrackIDs.contains(value);
                if (!isContaining) {
                    //console.log("REMOVE trackID: ", value);
                }
                return isContaining;
            });
        }
    }

    // add hitIDs or search for same values in hitID-list
    if (newHItIDs != null) {
        if (this.hitIDs.length == 0) {
            newHItIDs.forEach(function (hitID) {
                if (hitID != null) {
                    //console.log("add hitID: ", hitID);
                    that.hitIDs.push(hitID);
                }
            });
        } else {
            that.hitIDs.filter(function (value) {
                var isContaining =  newHItIDs.contains(value);
                if (!isContaining) {
                    //console.log("REMOVE hitID: ", value);
                }
                return isContaining;
            });
        }
    }
};

// ******************************************
// getter and setter methods
Hits.prototype.getTracks = function(){
    return this.trackIDs;
};

Hits.prototype.getHits = function(){
    return this.hitIDs;
};

Hits.prototype.addRelation = function(relationID){
    this.relationIDs.push(relationID);
};

Hits.prototype.getRelations = function(){
    return this.relationIDs;
};

module.exports = Hits;
