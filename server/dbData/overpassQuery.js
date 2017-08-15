/**
 * Created by simon on 20.04.15.
 * Copyright SAM [Rico Fritzsche, Christoph Prinz, Simon Sander]
 *
 * XML-Querys for overpass API to get crossings on a street
 * To create XML is used 'xmlbuilder'
 */

// osm highway type on which cars can drive
var higwayRegex = 'motorway|trunk|primary|residential|secondary|tertiary|unclassified'

exports.crossingFromStreetName = function (streetname, gps) {

    var overpassQuery =
    {
        'osm-script': {
        '@output': 'json',
            '#list': [
            {
                union: {
                    // requested street will save in the overpass variable 'street'
                    '@into': 'street',
                    query: {
                        // request a osm street with following attributes
                        '@into': '_', '@type': 'way',
                        '#list': [
                            // attribute name of the street is the requested 'streetname'
                            {'has-kv': {'@k': 'name', '@modv': '', '@v': streetname}},
                            // attribute highway is one of the list in higwayRegex
                            {'has-kv': {'@k': 'highway', '@regv': higwayRegex}},
                            // street is in a box defined by the cutted gps coordinates
                            {
                                'bbox-query': {
                                    '@into': '_',
                                    '@s': (Math.floor10(gps.lat, -1)),
                                    '@w': (Math.floor10(gps.lon, -1)),
                                    '@n': (Math.ceil10(gps.lat, -1)),
                                    '@e': (Math.ceil10(gps.lon, -1))
                                }
                            }
                        ]
                    }
                }
            },
            {
                // get all nodes on the requested street
                union: {
                    '@into': 'nodes',
                    recurse: {
                        '@from': 'street', '@into': '_', '@type': 'way-node'
                    }
                }
            },
            {
                // for all nodes run following steps
                foreach: {
                    '@from': 'nodes', '@into': '_',
                    '#list': [
                        {
                            // return node information
                            print: {
                                '@from': '_', '@geometry': 'skeleton', '@limit': '', '@mode': 'body', '@order': 'id',
                                '@s': '', '@w': '', '@n': '', '@e': ''
                            }
                        },
                        {
                            // get all street start or end for this node
                            query: {
                                '@into': '_', '@type': 'way',
                                '#list': [
                                    {'recurse': {'@from': '_', '@into': '_', '@type': 'node-way'}},
                                    {'has-kv': {'@k': 'highway', '@regv': higwayRegex}}
                                ]
                            }
                        },
                        {
                            // return the sum of all street on this node
                            print: {
                                '@from': '_', '@geometry': 'skeleton', '@limit': '', '@mode': 'count', '@order': 'id',
                                '@s': '', '@w': '', '@n': '', '@e': ''
                            }
                        }
                    ]
                }
            }
        ]
    }
    };
    return overpassQuery;
};

exports.crossingFromStreetID = function (id) {

    var overpassQuery =
    {
        'osm-script': {
            '@output': 'json',
            '#list': [
                // request street with the 'id' will save in the overpass variable 'street'
                {'id-query': {'@into': 'street', '@ref': id, '@type': 'way'}},
                {
                    // get all nodes on the requested street
                    union: {
                        '@into': 'nodes',
                        recurse: {
                            '@from': 'street', '@into': '_', '@type': 'way-node'
                        }
                    }
                },
                {
                    // for all nodes run following steps
                    foreach: {
                        '@from': 'nodes', '@into': '_',
                        '#list': [
                            {
                                // return node information
                                print: {
                                    '@from': '_', '@geometry': 'skeleton', '@limit': '', '@mode': 'body', '@order': 'id',
                                    '@s': '', '@w': '', '@n': '', '@e': ''
                                }
                            },
                            {
                                // get all street start or end for this node
                                query: {
                                    '@into': '_', '@type': 'way',
                                    '#list': [
                                        {'recurse': {'@from': '_', '@into': '_', '@type': 'node-way'}},
                                        {'has-kv': {'@k': 'highway', '@regv': higwayRegex}}
                                    ]
                                }
                            },
                            {
                                // return the sum of all street on this node
                                print: {
                                    '@from': '_', '@geometry': 'skeleton', '@limit': '', '@mode': 'count', '@order': 'id',
                                    '@s': '', '@w': '', '@n': '', '@e': ''
                                }
                            }
                        ]
                    }
                }
            ]
        }
    };
    return overpassQuery;
};

exports.crossingFromStreetNamewithStreetNames = function (streetname, gps) {

    var overpassQuery =
    {
        'osm-script': {
            '@output': 'json',
            '#list': [
                {
                    // requested street will save in the overpass variable 'street'
                    union: {
                        '@into': 'street',
                        query: {
                            // request a osm street with following attributes
                            '@into': '_', '@type': 'way',
                            '#list': [
                                // attribute name of the street is the requested 'streetname'
                                {'has-kv': {'@k': 'name', '@modv': '', '@v': streetname}},
                                // attribute highway is one of the list in higwayRegex
                                {'has-kv': {'@k': 'highway', '@regv': higwayRegex}},
                                {
                                    // street is in a box defined by the cutted gps coordinates
                                    'bbox-query': {
                                        '@into': '_',
                                        '@s': (Math.floor10(gps.lat, -1)),
                                        '@w': (Math.floor10(gps.lon, -1)),
                                        '@n': (Math.ceil10(gps.lat, -1)),
                                        '@e': (Math.ceil10(gps.lon, -1))
                                    }
                                }
                            ]
                        }
                    }
                },
                {
                    // get all nodes on the requested street
                    union: {
                        '@into': 'nodes',
                        recurse: {
                            '@from': 'street', '@into': '_', '@type': 'way-node'
                        }
                    }
                },
                {
                    // for all nodes run following steps
                    foreach: {
                        '@from': 'nodes', '@into': '_',
                        '#list': [
                            {
                                // return node information
                                print: {
                                    '@from': '_', '@geometry': 'skeleton', '@limit': '', '@mode': 'body', '@order': 'id',
                                    '@s': '', '@w': '', '@n': '', '@e': ''
                                }
                            },
                            {
                                // get all street start or end for this node
                                union: {
                                    '@into': 'otherStreets',
                                    query: {
                                        '@into': '_', '@type': 'way',
                                        '#list': [
                                            {'recurse': {'@from': '_', '@into': '_', '@type': 'node-way'}},
                                            {'has-kv': {'@k': 'highway', '@regv': higwayRegex}},
                                        ]
                                    }
                                }
                            },
                            {
                                // return the sum of all street on this node
                                print: {
                                    '@from': '_', '@geometry': 'skeleton', '@limit': '', '@mode': 'count', '@order': 'id',
                                    '@s': '', '@w': '', '@n': '', '@e': ''
                                }
                            },
                            {
                                // return the name of the crossing streets
                                print: {
                                    '@from': 'otherStreets', '@geometry': 'skeleton', '@limit': '', '@mode': 'body', '@order': 'id',
                                    '@s': '', '@w': '', '@n': '', '@e': ''
                                }
                            }
                        ]
                    }
                }
            ]
        }
    };
    return overpassQuery;
};

exports.crossingFromIDwithStreetNames = function (id) {

    var overpassQuery =
    {
        'osm-script': {
            '@output': 'json',
            '#list': [
                // request street with the 'id' will save in the overpass variable 'street'
                {'id-query': {'@into': 'street', '@ref': id, '@type': 'way'}},
                {
                    // get all ncompöeodes on the requested street
                    union: {
                        '@into': 'nodes',
                        recurse: {
                            '@from': 'street', '@into': '_', '@type': 'way-node'
                        }
                    }
                },
                {
                    // for all nodes run following steps
                    foreach: {
                        '@from': 'nodes', '@into': '_',
                        '#list': [
                            {
                                // return node information
                                print: {
                                    '@from': '_', '@geometry': 'skeleton', '@limit': '', '@mode': 'body', '@order': 'id',
                                    '@s': '', '@w': '', '@n': '', '@e': ''
                                }
                            },
                            {
                                // get all street start or end for this node
                                union: {
                                    '@into': 'otherStreets',
                                    query: {
                                        '@into': '_', '@type': 'way',
                                        '#list': [
                                            {'recurse': {'@from': '_', '@into': '_', '@type': 'node-way'}},
                                            {'has-kv': {'@k': 'highway', '@regv': higwayRegex}}
                                        ]
                                    }
                                }
                            },
                            {
                                // return the sum of all street on this node
                                print: {
                                    '@from': '_', '@geometry': 'skeleton', '@limit': '', '@mode': 'count', '@order': 'id',
                                    '@s': '', '@w': '', '@n': '', '@e': ''
                                }
                            },
                            {
                                // return the name of the crossing streets
                                print: {
                                    '@from': 'otherStreets', '@geometry': 'skeleton', '@limit': '', '@mode': 'body', '@order': 'id',
                                    '@s': '', '@w': '', '@n': '', '@e': ''
                                }
                            }
                        ]
                    }
                }
            ]
        }
    };
    return overpassQuery;
};
