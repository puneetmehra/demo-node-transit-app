var express = require('express');
var router = express.Router();

var monk = require('monk');
var rest = require('restler-q');
var xml2js = require('xml2js');
var Q = require('Q');

// global stuff that maybe should be localized (?)
var db = monk('localhost/transit');
var routes = db.get('routes');

//-----------------------------------------------------------
// Q wrapped methods that return promises

// DB-related wrapped calls
var distinctRoutesDB = Q.nbind(routes.distinct, routes);
var findRoutesDB = Q.nbind(routes.find, routes);
var insertStopDB = Q.nbind(routes.insert, routes);

// other helper wrapped calls
var parseXML = Q.nbind(xml2js.parseString, xml2js);


//------------------------------------------------------------------------------------------------
// get all distinct routes from mongo
var getAllRoutesDB = function() {

    var promise = distinctRoutesDB('route');
    promise.then(function (routes) {
        console.log("Routes: %s", routes);
    }, function(reason) {
        console.log("Unable to obtain routes: %s", reason);
    });
    return promise;
};


//------------------------------------------------------------------------------------------------
// Get stops for a given route from mongo
var getStopsDB = function(bus_route) {

    var promise = findRoutesDB({'route': bus_route});

    promise.then(function (stops) {
        if (stops.length == 0) {
            console.log("Found 0 entries in DB for route: %s", bus_route);
        }
        console.log("Found DB entry for route %s. Num Stops: %s", bus_route, stops.length);
    }, function (reason) {

    });
    return promise;
};


//------------------------------------------------------------------------------------------------
// make an API call to get stops for a given route
var getStopsAPI = function(bus_route) {

    var agency = "actransit";

    // do the REST call to get list of stops
    var url = 'http://webservices.nextbus.com/service/publicXMLFeed?command=routeConfig';
    var query = url.concat('&a=').concat(agency).concat('&r=').concat(bus_route);

    var promise = rest.get(query);
    return promise;
};

//------------------------------------------------------------------------------------------------
// Parse stop data from XML into JSON
var parseStopsToJSON = function(route_xml) {

    var promise = parseXML(route_xml);
    return promise;
}

//------------------------------------------------------------------------------------------------
// Add stops for a given route into mongo
var addStopsToDB = function(bus_route, stops) {

    console.log("addStopsToDB()");
    console.log("Route: %s Total # of stops:", bus_route, stops.length);

    // inject route into mongo
    for (var i = 0; i < stops.length; i++) {
        var stop = {
            route: bus_route,
            stopId: stops[i].$.stopId,
            title: stops[i].$.title,
            lat: stops[i].$.lat,
            lon: stops[i].$.lon
        };
        insertStopDB(stop).fail(function (error) {
            console.log("Unable to add stop for route: %s. Error: %s", bus_route, error);
        });
    }
    return stops;
};

//------------------------------------------------------------------------------------------------
// Re-render page given expected available routes, and current route/stops
var displayStops = function(available_routes, bus_route, stops, res) {

    renderIndex(res, {
            available_routes: available_routes,
            bus_route: bus_route,
            stops: stops,
            stop_count: stops.length
        }
    );
};


//----------------------------------------------------------------------------
// Need to add method to just render page
var renderIndex = function (res, params){

    var page_props = {
        title: 'AC Transit Route Stop List',
        bus_route: '',
        available_routes: [],
        stops: [],
        error: ''
    } ;

    // override any params passed in
    for (var key in params) {
        if(params.hasOwnProperty(key)) {
            page_props[key] = params[key];
        }
    }
    res.render('index', page_props);
};

/* GET home page. */
router.get('/', function(req, res) {

    // need to check which routes are in db and add to drop-down
    getAllRoutesDB().then(function (routes) {
        renderIndex(res, {'available_routes': routes});

    }, function (error) {
        console.log("Got error trying to get all routes");
        renderIndex(res, {});
    });
});


// POST home page -- causes re-render of page
router.post('/', function(req, res) {

    var bus_route = req.body.bus_route.toUpperCase();
    var agency = 'actransit';

    getAllRoutesDB().then(function (available_routes) {

        // have routes here that we need to display
        // now get the stops for route provided
        getStopsDB(bus_route).then(function (stops) {

             // if the route's already in the DB
            if (stops.length > 0) {
                displayStops(available_routes, bus_route, stops, res);
            } else {

                // need to make an API call and go from there.
                getStopsAPI(bus_route).then(function(stops_xml) {
                    parseStopsToJSON(stops_xml).then(function(stops_json) {

                        // make sure that we got something sane
                        if (stops_json.body.hasOwnProperty('route') == false) {
                            console.log('Error: Unable to obtain stop information. Route: %s', bus_route);
                            displayStops(available_routes, bus_route, [], res);
                        }
                        var stops = stops_json.body.route[0].stop;
                        addStopsToDB(bus_route, stops);
                         return res.redirect('http://' + req.get('host') + req.url);
                    });
                });
            }
        });
    });
});

module.exports = router;
