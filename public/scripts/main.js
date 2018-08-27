(function(){function r(e,n,t){function o(i,f){if(!n[i]){if(!e[i]){var c="function"==typeof require&&require;if(!f&&c)return c(i,!0);if(u)return u(i,!0);var a=new Error("Cannot find module '"+i+"'");throw a.code="MODULE_NOT_FOUND",a}var p=n[i]={exports:{}};e[i][0].call(p.exports,function(r){var n=e[i][1][r];return o(n||r)},p,p.exports,r,e,n,t)}return n[i].exports}for(var u="function"==typeof require&&require,i=0;i<t.length;i++)o(t[i]);return o}return r})()({1:[function(require,module,exports){
'use strict';

// create empty object to store all methods
var app = {};

// create empty objects/arrays on app object to store the information to be used later on
app.user = {};
app.destination = {};
app.weather = {};
app.currency = {};
app.POIs = [];
app.exchangeRate;
app.tours = [];
app.airport = {};
app.language = {};

// method to init Googlde Autocomplete;
// takes parameter of an id to target specific input tags
app.initAutocomplete = function (id) {
    new google.maps.places.Autocomplete(document.getElementById(id));
};

// most of the APIs we are requesting data from accept location info in the form of lat lng coords
// so we enter the user's input into Google geocoder to get lat and lng coords to use in other API requests
app.getDestinationInfo = function (location) {
    var geocoder = new google.maps.Geocoder();
    geocoder.geocode({
        'address': location
    }, function (results, status) {
        // if there is no error, filter the result so that the component is a "country"
        if (status == google.maps.GeocoderStatus.OK) {
            var addressComponents = results[0].address_components.filter(function (component) {
                return component.types[0] === 'country';
            });
            // out of the results of the filter, get the info and populate the app.destination object
            app.destination.countryCode = addressComponents[0].short_name;
            app.destination.countryName = addressComponents[0].long_name;
            app.destination.lat = results[0].geometry.location.lat();
            app.destination.lng = results[0].geometry.location.lng();
            app.getWeather(app.destination.lat, app.destination.lng);
            app.getCurrency(app.destination.countryCode);
            app.getCityCode(app.destination.lat, app.destination.lng);
            app.getLanguage(app.destination.countryCode);
            app.getAirports(app.destination.lat, app.destination.lng);
        } else {
            alert("Something went wrong." + status);
        }
    });
};

// ajax call to get weather
// takes lat and lng coords as parameters
app.getWeather = function (latitude, longitude) {
    $.ajax({
        url: 'https://api.darksky.net/forecast/ea2f7a7bab3daacc9f54f177819fa1d3/' + latitude + ',' + longitude,
        method: 'GET',
        dataType: 'jsonp',
        data: {
            'units': 'auto'
        }
    }).then(function (res) {
        // take result and pull desired information into app.weather object
        app.weather.conditions = res.daily.summary;
        app.weather.currentTemp = Math.round(res.currently.temperature);
        app.weather.icon = res.daily.icon;
        app.displayWeather(app.weather);
    });
};

// i found that the points of interest and tours request works better with a city code instead of lat and lng coords
// method to get city code from lat and lng to use in other ajax requests
app.getCityCode = function (latitude, longitude) {
    $.ajax({
        url: 'https://api.sygictravelapi.com/1.0/en/places/detect-parents',
        method: 'GET',
        dataType: 'json',
        headers: {
            'x-api-key': 'zziJYcjlmE8LbWHdvU5vC8UcSFvKEPsC3nkAl7eK'
        },
        data: {
            'location': latitude + ',' + longitude
        }
    }).then(function (res) {
        console.log(res);
        var data = res.data.places[0];
        console.log(data);

        // we specifically want to target cities
        // if that result is a level smaller than a city, target the next parent ID
        if (data.level !== 'city') {
            var cityCode = data.parent_ids[0];
            console.log(data.parent_ids[0]);
            console.log(cityCode);
            app.getPOIs(cityCode);
            app.getTours(cityCode);
        } else {
            // if the result is a city, just use that id in the other rquests
            var _cityCode = data.id;
            app.getPOIs(_cityCode);
            app.getTours(_cityCode);
        }
    });
};

// method to get POIs (points of interest);
app.getPOIs = function (cityCode) {
    $.ajax({
        url: 'https://api.sygictravelapi.com/1.0/en/places/list',
        method: 'GET',
        dataType: 'json',
        headers: {
            'x-api-key': 'zziJYcjlmE8LbWHdvU5vC8UcSFvKEPsC3nkAl7eK'
        },
        data: {
            'tags_not': 'Airport',
            'parents': cityCode,
            'level': 'poi',
            'limit': 20
        }
    }).then(function (res) {
        var points = res.data.places;

        // we only want results that have an image and a descriptions (perex)
        var filteredPoints = points.filter(function (place) {
            return place.thumbnail_url && place.perex;
        });

        // if there are no results that have an image and a description, call the displayError function
        if (filteredPoints.length === 0) {
            app.displayError('poi', 'points of interest');
        } else {
            // take the first 3 items and push their properties onto the app.POIs object
            filteredPoints.forEach(function (point) {
                var place = {
                    'name': point.name,
                    'description': point.perex,
                    'photo': point.thumbnail_url
                };
                app.POIs.push(place);
            });
            app.displayPOIs(app.POIs);
        }
    });
};
//method to get closest airport
app.getAirports = function (lat, lng) {
    $.ajax({
        url: 'https://api.sygictravelapi.com/1.0/en/places/list',
        method: 'GET',
        dataType: 'json',
        headers: {
            'x-api-key': 'zziJYcjlmE8LbWHdvU5vC8UcSFvKEPsC3nkAl7eK'
        },
        data: {
            'location': lat + ',' + lng,
            'tags': 'Airport'
        }
    }).then(function (res) {
        // push the properties onto app.airport object
        app.airport.name = res.data.places[0].name;
        app.airport.description = res.data.places[0].perex;
        app.airport.photo = res.data.places[0].thumbnail_url;

        // call displayAirports using properties from ajax request
        app.displayAirports(app.airport);
    });
};

// method to get language
app.getLanguage = function (country) {
    $.ajax({
        url: 'https://restcountries.eu/rest/v2/name/' + country,
        method: 'GET',
        dataType: 'json',
        data: {
            fullText: true
        }
    }).then(function (res) {
        console.log(res);
        app.language.primary = res[0].languages[0].name;
        if (res[0].languages.length > 1) {
            app.language.secondary = res[0].languages[1].name;
        }
        app.displayLanguage(app.language);
    });
};

// 
app.getTours = function (cityCode) {
    $.ajax({
        url: 'https://api.sygictravelapi.com/1.0/en/tours/viator',
        method: 'GET',
        dataType: 'json',
        headers: {
            'x-api-key': 'zziJYcjlmE8LbWHdvU5vC8UcSFvKEPsC3nkAl7eK'
        },
        data: {
            'parent_place_id': cityCode
        }
    }).then(function (res) {
        console.log(res);
        var list = res.data.tours;
        console.log(tours);
        var tours = list.filter(function (place) {
            return place.photo_url && place.url;
        });
        if (tours.length === 0) {
            app.displayError('tours', 'tours');
        } else {
            for (var i = 0; i < tours.length; i++) {
                var tour = {
                    name: tours[i].title,
                    photo: tours[i].photo_url,
                    url: tours[i].url
                };
                app.tours.push(tour);
            }
            console.log(app.tours);
            app.displayTours(app.tours);
        }
    });
};

app.getCurrency = function (countryCode) {
    $.ajax({
        url: 'https://restcountries.eu/rest/v2/name/' + countryCode,
        method: 'GET',
        dataType: 'json',
        data: {
            fullText: true
        }
    }).then(function (res) {
        app.currency.code = res[0].currencies[0].code;
        app.currency.symbol = res[0].currencies[0].symbol;
        app.displayCurrency(app.currency);
    });
};

app.convertCurrency = function (userCurrency, destinationCurrency) {
    $.ajax({
        url: 'https://free.currencyconverterapi.com/api/v6/convert',
        method: 'GET',
        dataType: 'json',
        data: {
            q: userCurrency + '_' + destinationCurrency + ',' + destinationCurrency + '_' + userCurrency,
            compact: 'ultra'
        }
    }).then(function (res) {
        console.log(res);
        app.currency.exchangeRate = res[userCurrency + '_' + destinationCurrency];
        console.log(app.currency.exchangeRate);

        $('#currency').append('<h2>$1 ' + userCurrency + ' = ' + app.currency.symbol + ' ' + app.currency.exchangeRate.toFixed(2) + ' ' + destinationCurrency + '</h2>');
    });
};

app.displayError = function (divID, topic) {
    var title = '<h1>' + topic + '</h1>';
    console.log('error');
    $('#' + divID).append(title, '<h2>Sorry, we don\'t have detailed information about ' + topic + ' in this area. Try your search again in a nearby city or related area.</h2>');
};

app.displayCurrency = function (object) {
    var title = '<h3>Currency</h3>';
    var html = '<h2>The currency used is ' + object.symbol + ' ' + object.code + '</h2>';
    var input = '<form id="userCurrency"><input class="userCurrency  type="search" id="user" placeholder="Enter your location."></form>';
    $('#currency').append(title, html, input);
    app.getUserInfo();
};

app.getUserInfo = function () {
    app.initAutocomplete('user');
    $('#userCurrency').on('submit', function (e) {
        e.preventDefault();
        var userLocation = $('#user').val();
        app.getUserLocation(userLocation);
    });
};

app.getUserLocation = function (location) {
    new google.maps.places.Autocomplete(document.getElementById('user'));
    var geocoder = new google.maps.Geocoder();
    geocoder.geocode({
        'address': location
    }, function (results, status) {
        if (status == google.maps.GeocoderStatus.OK) {
            var addressComponents = results[0].address_components.filter(function (component) {
                return component.types[0] === 'country';
            });
            app.user.countryCode = addressComponents[0].short_name;
            console.log(app.user.countryCode);
        } else {
            alert('Sorry, something went wrong.' + status);
        }
        app.getUserCurrency(app.user.countryCode);
    });
};

app.getUserCurrency = function (countryCode) {
    $.ajax({
        url: 'https://restcountries.eu/rest/v2/name/' + countryCode,
        method: 'GET',
        dataType: 'json',
        data: {
            fullText: true
        }
    }).then(function (res) {
        app.user.code = res[0].currencies[0].code;
        console.log(app.user.code);
        app.convertCurrency(app.user.code, app.currency.code);
    });
};

app.displayLanguage = function (object) {
    console.log(object.name, object.nativeName);
    var title = '<h3>Language</h3>';
    var primary = '<h2>Primary</h2><h4>' + object.primary + '</h4>';
    var secondary = '<h2>Secondary</h2><h4>' + object.secondary + '</h4>';
    $('#language').append(title, primary);
    if (object.secondary !== undefined) {
        $('#language').append(secondary);
    }
};

app.displayAirports = function (object) {
    var title = '<h3>Closest Airport</h3>';
    var name = '<h4>' + object.name + '</h4>';
    // const desc = `<p>${object.description}</p>`;
    // const photo = `<img src="${object.photo}"/>`;
    $('#airport').append(title, name);
};

// method to display tours
// i realized when there's a lot of results, it's not ideal for mobile users
// so i tried some simple "pagination" when the screen width is less than 600px
// create 2 variables, one to act as a "counter" and one to dictate results per page
// when user clicks 'load more', it appends the next three results, removes the button, and appends a new button at the end of the new results
app.displayTours = function (array) {
    var title = '<h3>Top Tours</h3>';
    $('#tours').append(title);

    if ($(window).width() <= 600) {
        var counter = 0;
        var resultsPerPage = 3;
        for (var i = counter; i < resultsPerPage; i++) {
            var div = $('<div class="clearfix hvr-shadow">');
            var name = '<h2>' + array[i].name + '<h2>';
            var photo = '<img class="hvr-grow-shadow" src="' + array[i].photo + '">';
            var link = '<a class="hvr-underline-from-center" href="' + array.url + '">Book Now</a>';

            var text = $('<div>').append(name, link);
            div.append(photo, text);
            $('#tours').append(div);
        }

        var loadMore = '<button class="loadMore hvr-grow-shadow">Load More</button>';
        $('#tours').append(loadMore);
        $('#tours').on('click', '.loadMore', function () {
            this.remove();
            counter += 3;
            for (var _i = counter; _i < counter + resultsPerPage; _i++) {
                var _div = $('<div class="clearfix hvr-shadow">');
                var _name = '<h2>' + array[_i].name + '<h2>';
                var _photo = '<img class="hvr-grow-shadow"  src="' + array[_i].photo + '">';
                var _link = '<a class="hvr-underline-from-center" href="' + array.url + '">Book Now</a>';

                var _text = $('<div>').append(_name, _link);
                _div.append(_photo, _text);
                $('#tours').append(_div);
            }
            $('#tours').append(loadMore);
        });

        // if screen width is not less than 600px, append elements normally
    } else {
        array.forEach(function (item) {
            var div = $('<div class="clearfix hvr-shadow">');
            var name = '<h2>' + item.name + '<h2>';
            var photo = '<img class="hvr-grow-shadow" src="' + item.photo + '">';
            var link = '<a class="hvr-underline-from-center" href="' + item.url + '">Book Now</a>';
            var text = $('<div>').append(name, link);
            div.append(photo, text);
            $('#tours').append(div);
        });
    }
};

// method to display points of interest
// same "pagination" system as tours
app.displayPOIs = function (array) {
    var title = '<h3>Points of Interest</h3>';
    $('#poi').append(title);
    if ($(window).width() <= 600) {
        var counter = 0;
        var resultsPerPage = 3;
        for (var i = counter; i < resultsPerPage; i++) {
            var div = $('<div class="clearfix hvr-shadow">');
            var name = '<h2>' + array[i].name + '<h2>';
            var desc = '<p>' + array[i].description + '</p>';
            var photo = '<img class="hvr-grow-shadow" src="' + array[i].photo + '">';
            var text = $('<div>').append(name, desc);

            div.append(photo, text);
            $('#poi').append(div);
        }

        var loadMore = '<button class="loadMore hvr-grow-shadow">Load More</button>';
        $('#poi').append(loadMore);

        $('#poi').on('click', '.loadMore', function () {
            this.remove();
            counter += 3;
            for (var _i2 = counter; _i2 < counter + resultsPerPage; _i2++) {
                var _div2 = $('<div class="clearfix hvr-shadow">');
                var _name2 = '<h2>' + array[_i2].name + '<h2>';
                var _desc = '<p>' + array[_i2].description + '</p>';
                var _photo2 = '<img class="hvr-grow-shadow" src="' + array[_i2].photo + '">';
                var _text2 = $('<div>').append(_name2, _desc);

                _div2.append(_photo2, _text2);
                $('#poi').append(_div2);
            }
            $('#poi').append(loadMore);
        });
        // else just append all the results normally
    } else {
        array.forEach(function (item) {
            var div = $('<div class="clearfix hvr-shadow">');
            var name = '<h2>' + item.name + '<h2>';
            var desc = '<p>' + item.description + '</p>';
            var photo = '<img class="hvr-grow-shadow" src="' + item.photo + '">';
            var text = $('<div>').append(name, desc);
            div.append(photo, text);
            $('#poi').append(div);
        });
    }
};

app.displayWeather = function (object) {
    var title = '<h3>Weather</h3>';
    var icon = '<canvas id="' + object.icon + '" width="80" height="80"></canvas>';
    var html = '<h2>Currently:</h2> \n    <h4>' + object.currentTemp + '</h4>\n        <p class="weatherText">' + object.conditions + '</p>';
    $('#weather').append(title, icon, html);
    app.loadIcons();
};

app.randomHero = function () {
    var i = Math.floor(Math.random() * 5) + 1;
    console.log(i);
    $('.splashPage').css({
        'background': 'linear-gradient(rgba(0,0,0,0.5), rgba(0,0,0,0.5)), url("../../public/assets/hero' + i + '.jpg")',
        'background-position': 'center',
        'background-size': 'cover'
    });
};

app.loadIcons = function () {
    var icons = new Skycons({ "color": "black" });
    icons.set("clear-day", Skycons.CLEAR_DAY);
    icons.set("clear-night", Skycons.CLEAR_NIGHT);
    icons.set("partly-cloudy-day", Skycons.PARTLY_CLOUDY_DAY);
    icons.set("partly-cloudy-night", Skycons.PARTLY_CLOUDY_NIGHT);
    icons.set("cloudy", Skycons.CLOUDY);
    icons.set("rain", Skycons.RAIN);
    icons.set("sleet", Skycons.SLEET);
    icons.set("snow", Skycons.SNOW);
    icons.set("wind", Skycons.WIND);
    icons.set("fog", Skycons.FOG);
    icons.play();
};

app.events = function () {
    app.initAutocomplete('destination');
    $('form').on('submit', function (e) {
        $('#splashPage').toggle(false);
        $('#contentPage').toggle(true);
        $('form').removeClass('splashSearchForm');
        $('#destination').removeClass('splashSearchBar');
        $('form').addClass('contentSearchForm');
        $('#destination').addClass('contentSearchBar');
        e.preventDefault();
        $('div').empty();
        var destination = $('#destination').val();
        if (destination.length > 0) {
            $('#destinationName').text(destination);
            app.getDestinationInfo(destination);
        }
        $('#destination').val('');
        app.destination = {};
        app.weather = {};
        app.currency = {};
        app.POIs = [];
        app.exchangeRate;
        app.tours = [];
        app.airport = {};
        app.languages = {};
    });
};

app.init = function () {
    app.randomHero();
    app.initAutocomplete('destination');
    $('#contentPage').toggle(false);
    app.events();
};

$(function () {
    console.log("ready!");
    app.init();
});

},{}]},{},[1])
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJkZXYvc2NyaXB0cy9tYWluLmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7QUNBQTtBQUNBLElBQU0sTUFBTSxFQUFaOztBQUVBO0FBQ0EsSUFBSSxJQUFKLEdBQVcsRUFBWDtBQUNBLElBQUksV0FBSixHQUFrQixFQUFsQjtBQUNBLElBQUksT0FBSixHQUFjLEVBQWQ7QUFDQSxJQUFJLFFBQUosR0FBYyxFQUFkO0FBQ0EsSUFBSSxJQUFKLEdBQVcsRUFBWDtBQUNBLElBQUksWUFBSjtBQUNBLElBQUksS0FBSixHQUFZLEVBQVo7QUFDQSxJQUFJLE9BQUosR0FBYyxFQUFkO0FBQ0EsSUFBSSxRQUFKLEdBQWUsRUFBZjs7QUFHQTtBQUNBO0FBQ0EsSUFBSSxnQkFBSixHQUF1QixVQUFDLEVBQUQsRUFBUTtBQUMzQixRQUFJLE9BQU8sSUFBUCxDQUFZLE1BQVosQ0FBbUIsWUFBdkIsQ0FBb0MsU0FBUyxjQUFULENBQXdCLEVBQXhCLENBQXBDO0FBQ0gsQ0FGRDs7QUFJQTtBQUNBO0FBQ0EsSUFBSSxrQkFBSixHQUF5QixVQUFDLFFBQUQsRUFBYztBQUNuQyxRQUFNLFdBQVcsSUFBSSxPQUFPLElBQVAsQ0FBWSxRQUFoQixFQUFqQjtBQUNBLGFBQVMsT0FBVCxDQUFpQjtBQUNiLG1CQUFXO0FBREUsS0FBakIsRUFFRyxVQUFDLE9BQUQsRUFBVSxNQUFWLEVBQXFCO0FBQ3BCO0FBQ0EsWUFBSSxVQUFVLE9BQU8sSUFBUCxDQUFZLGNBQVosQ0FBMkIsRUFBekMsRUFBNkM7QUFDekMsZ0JBQU0sb0JBQW9CLFFBQVEsQ0FBUixFQUFXLGtCQUFYLENBQThCLE1BQTlCLENBQXFDLFVBQUMsU0FBRCxFQUFlO0FBQzFFLHVCQUFPLFVBQVUsS0FBVixDQUFnQixDQUFoQixNQUF1QixTQUE5QjtBQUNILGFBRnlCLENBQTFCO0FBR0E7QUFDQSxnQkFBSSxXQUFKLENBQWdCLFdBQWhCLEdB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QjtBQUNIO0FBQ0QsVUFBRSxjQUFGLEVBQWtCLEdBQWxCLENBQXNCLEVBQXRCO0FBQ0EsWUFBSSxXQUFKLEdBQWtCLEVBQWxCO0FBQ0EsWUFBSSxPQUFKLEdBQWMsRUFBZDtBQUNBLFlBQUksUUFBSixHQUFjLEVBQWQ7QUFDQSxZQUFJLElBQUosR0FBVyxFQUFYO0FBQ0EsWUFBSSxZQUFKO0FBQ0EsWUFBSSxLQUFKLEdBQVksRUFBWjtBQUNBLFlBQUksT0FBSixHQUFjLEVBQWQ7QUFDQSxZQUFJLFNBQUosR0FBZ0IsRUFBaEI7QUFDSCxLQXZCRDtBQXdCSCxDQTFCRDs7QUE0QkEsSUFBSSxJQUFKLEdBQVcsWUFBTTtBQUNiLFFBQUksVUFBSjtBQUNBLFFBQUksZ0JBQUosQ0FBcUIsYUFBckI7QUFDQSxNQUFFLGNBQUYsRUFBa0IsTUFBbEIsQ0FBeUIsS0FBekI7QUFDQSxRQUFJLE1BQUo7QUFDSCxDQUxEOztBQU9BLEVBQUUsWUFBWTtBQUNWLFlBQVEsR0FBUixDQUFZLFFBQVo7QUFDQSxRQUFJLElBQUo7QUFDSCxDQUhEIiwiZmlsZSI6ImdlbmVyYXRlZC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzQ29udGVudCI6WyIoZnVuY3Rpb24oKXtmdW5jdGlvbiByKGUsbix0KXtmdW5jdGlvbiBvKGksZil7aWYoIW5baV0pe2lmKCFlW2ldKXt2YXIgYz1cImZ1bmN0aW9uXCI9PXR5cGVvZiByZXF1aXJlJiZyZXF1aXJlO2lmKCFmJiZjKXJldHVybiBjKGksITApO2lmKHUpcmV0dXJuIHUoaSwhMCk7dmFyIGE9bmV3IEVycm9yKFwiQ2Fubm90IGZpbmQgbW9kdWxlICdcIitpK1wiJ1wiKTt0aHJvdyBhLmNvZGU9XCJNT0RVTEVfTk9UX0ZPVU5EXCIsYX12YXIgcD1uW2ldPXtleHBvcnRzOnt9fTtlW2ldWzBdLmNhbGwocC5leHBvcnRzLGZ1bmN0aW9uKHIpe3ZhciBuPWVbaV1bMV1bcl07cmV0dXJuIG8obnx8cil9LHAscC5leHBvcnRzLHIsZSxuLHQpfXJldHVybiBuW2ldLmV4cG9ydHN9Zm9yKHZhciB1PVwiZnVuY3Rpb25cIj09dHlwZW9mIHJlcXVpcmUmJnJlcXVpcmUsaT0wO2k8dC5sZW5ndGg7aSsrKW8odFtpXSk7cmV0dXJuIG99cmV0dXJuIHJ9KSgpIiwiLy8gY3JlYXRlIGVtcHR5IG9iamVjdCB0byBzdG9yZSBhbGwgbWV0aG9kc1xyXG5jb25zdCBhcHAgPSB7fTtcclxuXHJcbi8vIGNyZWF0ZSBlbXB0eSBvYmplY3RzL2FycmF5cyBvbiBhcHAgb2JqZWN0IHRvIHN0b3JlIHRoZSBpbmZvcm1hdGlvbiB0byBiZSB1c2VkIGxhdGVyIG9uXHJcbmFwcC51c2VyID0ge307XHJcbmFwcC5kZXN0aW5hdGlvbiA9IHt9O1xyXG5hcHAud2VhdGhlciA9IHt9O1xyXG5hcHAuY3VycmVuY3k9IHt9O1xyXG5hcHAuUE9JcyA9IFtdO1xyXG5hcHAuZXhjaGFuZ2VSYXRlO1xyXG5hcHAudG91cnMgPSBbXTtcclxuYXBwLmFpcnBvcnQgPSB7fTtcclxuYXBwLmxhbmd1YWdlID0ge307XHJcblxyXG5cclxuLy8gbWV0aG9kIHRvIGluaXQgR29vZ2xkZSBBdXRvY29tcGxldGU7XHJcbi8vIHRha2VzIHBhcmFtZXRlciBvZiBhbiBpZCB0byB0YXJnZXQgc3BlY2lmaWMgaW5wdXQgdGFnc1xyXG5hcHAuaW5pdEF1dG9jb21wbGV0ZSA9IChpZCkgPT4ge1xyXG4gICAgbmV3IGdvb2dsZS5tYXBzLnBsYWNlcy5BdXRvY29tcGxldGUoZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoaWQpKTtcclxufVxyXG5cclxuLy8gbW9zdCBvZiB0aGUgQVBJcyB3ZSBhcmUgcmVxdWVzdGluZyBkYXRhIGZyb20gYWNjZXB0IGxvY2F0aW9uIGluZm8gaW4gdGhlIGZvcm0gb2YgbGF0IGxuZyBjb29yZHNcclxuLy8gc28gd2UgZW50ZXIgdGhlIHVzZXIncyBpbnB1dCBpbnRvIEdvb2dsZSBnZW9jb2RlciB0byBnZXQgbGF0IGFuZCBsbmcgY29vcmRzIHRvIHVzZSBpbiBvdGhlciBBUEkgcmVxdWVzdHNcclxuYXBwLmdldERlc3RpbmF0aW9uSW5mbyA9IChsb2NhdGlvbikgPT4ge1xyXG4gICAgY29uc3QgZ2VvY29kZXIgPSBuZXcgZ29vZ2xlLm1hcHMuR2VvY29kZXIoKTtcclxuICAgIGdlb2NvZGVyLmdlb2NvZGUoe1xyXG4gICAgICAgICdhZGRyZXNzJzogbG9jYXRpb25cclxuICAgIH0sIChyZXN1bHRzLCBzdGF0dXMpID0+IHtcclxuICAgICAgICAvLyBpZiB0aGVyZSBpcyBubyBlcnJvciwgZmlsdGVyIHRoZSByZXN1bHQgc28gdGhhdCB0aGUgY29tcG9uZW50IGlzIGEgXCJjb3VudHJ5XCJcclxuICAgICAgICBpZiAoc3RhdHVzID09IGdvb2dsZS5tYXBzLkdlb2NvZGVyU3RhdHVzLk9LKSB7XHJcbiAgICAgICAgICAgIGNvbnN0IGFkZHJlc3NDb21wb25lbnRzID0gcmVzdWx0c1swXS5hZGRyZXNzX2NvbXBvbmVudHMuZmlsdGVyKChjb21wb25lbnQpID0+IHtcclxuICAgICAgICAgICAgICAgIHJldHVybiBjb21wb25lbnQudHlwZXNbMF0gPT09ICdjb3VudHJ5JztcclxuICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgIC8vIG91dCBvZiB0aGUgcmVzdWx0cyBvZiB0aGUgZmlsdGVyLCBnZXQgdGhlIGluZm8gYW5kIHBvcHVsYXRlIHRoZSBhcHAuZGVzdGluYXRpb24gb2JqZWN0XHJcbiAgICAgICAgICAgIGFwcC5kZXN0aW5hdGlvbi5jb3VudHJ5Q29kZSA9IGFkZHJlc3NDb21wb25lbnRzWzBdLnNob3J0X25hbWU7XHJcbiAgICAgICAgICAgIGFwcC5kZXN0aW5hdGlvbi5jb3VudHJ5TmFtZSA9IGFkZHJlc3NDb21wb25lbnRzWzBdLmxvbmdfbmFtZTtcclxuICAgICAgICAgICAgYXBwLmRlc3RpbmF0aW9uLmxhdCA9IHJlc3VsdHNbMF0uZ2VvbWV0cnkubG9jYXRpb24ubGF0KCk7XHJcbiAgICAgICAgICAgIGFwcC5kZXN0aW5hdGlvbi5sbmcgPSByZXN1bHRzWzBdLmdlb21ldHJ5LmxvY2F0aW9uLmxuZygpO1xyXG4gICAgICAgICAgICBhcHAuZ2V0V2VhdGhlcihhcHAuZGVzdGluYXRpb24ubGF0LCBhcHAuZGVzdGluYXRpb24ubG5nKTtcclxuICAgICAgICAgICAgYXBwLmdldEN1cnJlbmN5KGFwcC5kZXN0aW5hdGlvbi5jb3VudHJ5Q29kZSk7XHJcbiAgICAgICAgICAgIGFwcC5nZXRDaXR5Q29kZShhcHAuZGVzdGluYXRpb24ubGF0LCBhcHAuZGVzdGluYXRpb24ubG5nKTtcclxuICAgICAgICAgICAgYXBwLmdldExhbmd1YWdlKGFwcC5kZXN0aW5hdGlvbi5jb3VudHJ5Q29kZSk7XHJcbiAgICAgICAgICAgIGFwcC5nZXRBaXJwb3J0cyhhcHAuZGVzdGluYXRpb24ubGF0LCBhcHAuZGVzdGluYXRpb24ubG5nKTtcclxuICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICBhbGVydChcIlNvbWV0aGluZyB3ZW50IHdyb25nLlwiICsgc3RhdHVzKTtcclxuICAgICAgICB9XHJcbiAgICB9KTtcclxufVxyXG5cclxuXHJcbi8vIGFqYXggY2FsbCB0byBnZXQgd2VhdGhlclxyXG4vLyB0YWtlcyBsYXQgYW5kIGxuZyBjb29yZHMgYXMgcGFyYW1ldGVyc1xyXG5hcHAuZ2V0V2VhdGhlciA9IChsYXRpdHVkZSwgbG9uZ2l0dWRlKSA9PiB7XHJcbiAgICAkLmFqYXgoe1xyXG4gICAgICAgIHVybDogYGh0dHBzOi8vYXBpLmRhcmtza3kubmV0L2ZvcmVjYXN0L2VhMmY3YTdiYWIzZGFhY2M5ZjU0ZjE3NzgxOWZhMWQzLyR7bGF0aXR1ZGV9LCR7bG9uZ2l0dWRlfWAsXHJcbiAgICAgICAgbWV0aG9kOiAnR0VUJyxcclxuICAgICAgICBkYXRhVHlwZTogJ2pzb25wJyxcclxuICAgICAgICBkYXRhOiB7XHJcbiAgICAgICAgICAgICd1bml0cyc6ICdhdXRvJ1xyXG4gICAgICAgIH1cclxuICAgIH0pXHJcbiAgICAudGhlbigocmVzKSA9PiB7XHJcbiAgICAgICAgLy8gdGFrZSByZXN1bHQgYW5kIHB1bGwgZGVzaXJlZCBpbmZvcm1hdGlvbiBpbnRvIGFwcC53ZWF0aGVyIG9iamVjdFxyXG4gICAgICAgIGFwcC53ZWF0aGVyLmNvbmRpdGlvbnMgPSByZXMuZGFpbHkuc3VtbWFyeTtcclxuICAgICAgICBhcHAud2VhdGhlci5jdXJyZW50VGVtcCA9IE1hdGgucm91bmQocmVzLmN1cnJlbnRseS50ZW1wZXJhdHVyZSk7XHJcbiAgICAgICAgYXBwLndlYXRoZXIuaWNvbiA9IHJlcy5kYWlseS5pY29uO1xyXG4gICAgICAgIGFwcC5kaXNwbGF5V2VhdGhlcihhcHAud2VhdGhlcik7XHJcbiAgICAgICAgXHJcbiAgICB9KTtcclxufVxyXG5cclxuLy8gaSBmb3VuZCB0aGF0IHRoZSBwb2ludHMgb2YgaW50ZXJlc3QgYW5kIHRvdXJzIHJlcXVlc3Qgd29ya3MgYmV0dGVyIHdpdGggYSBjaXR5IGNvZGUgaW5zdGVhZCBvZiBsYXQgYW5kIGxuZyBjb29yZHNcclxuLy8gbWV0aG9kIHRvIGdldCBjaXR5IGNvZGUgZnJvbSBsYXQgYW5kIGxuZyB0byB1c2UgaW4gb3RoZXIgYWpheCByZXF1ZXN0c1xyXG5hcHAuZ2V0Q2l0eUNvZGUgPSAobGF0aXR1ZGUsIGxvbmdpdHVkZSkgPT4ge1xyXG4gICAgJC5hamF4KHtcclxuICAgICAgICB1cmw6IGBodHRwczovL2FwaS5zeWdpY3RyYXZlbGFwaS5jb20vMS4wL2VuL3BsYWNlcy9kZXRlY3QtcGFyZW50c2AsXHJcbiAgICAgICAgbWV0aG9kOiAnR0VUJyxcclxuICAgICAgICBkYXRhVHlwZTogJ2pzb24nLFxyXG4gICAgICAgIGhlYWRlcnM6IHtcclxuICAgICAgICAgICAgJ3gtYXBpLWtleSc6ICd6emlKWWNqbG1FOExiV0hkdlU1dkM4VWNTRnZLRVBzQzNua0FsN2VLJ1xyXG4gICAgICAgIH0sXHJcbiAgICAgICAgZGF0YToge1xyXG4gICAgICAgICAgICAnbG9jYXRpb24nOiBgJHtsYXRpdHVkZX0sJHtsb25naXR1ZGV9YFxyXG4gICAgICAgIH1cclxuICAgIH0pXHJcbiAgICAudGhlbigocmVzKSA9PiB7XHJcbiAgICAgICAgY29uc29sZS5sb2cocmVzKTtcclxuICAgICAgICBjb25zdCBkYXRhID0gcmVzLmRhdGEucGxhY2VzWzBdO1xyXG4gICAgICAgIGNvbnNvbGUubG9nKGRhdGEpO1xyXG5cclxuICAgICAgICAvLyB3ZSBzcGVjaWZpY2FsbHkgd2FudCB0byB0YXJnZXQgY2l0aWVzXHJcbiAgICAgICAgLy8gaWYgdGhhdCByZXN1bHQgaXMgYSBsZXZlbCBzbWFsbGVyIHRoYW4gYSBjaXR5LCB0YXJnZXQgdGhlIG5leHQgcGFyZW50IElEXHJcbiAgICAgICAgaWYgKGRhdGEubGV2ZWwgIT09ICdjaXR5Jykge1xyXG4gICAgICAgICAgICBjb25zdCBjaXR5Q29kZSA9IGRhdGEucGFyZW50X2lkc1swXTtcclxuICAgICAgICAgICAgY29uc29sZS5sb2coZGF0YS5wYXJlbnRfaWRzWzBdKTtcclxuICAgICAgICAgICAgY29uc29sZS5sb2coY2l0eUNvZGUpO1xyXG4gICAgICAgICAgICBhcHAuZ2V0UE9JcyhjaXR5Q29kZSk7XHJcbiAgICAgICAgICAgIGFwcC5nZXRUb3VycyhjaXR5Q29kZSk7XHJcbiAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAvLyBpZiB0aGUgcmVzdWx0IGlzIGEgY2l0eSwganVzdCB1c2UgdGhhdCBpZCBpbiB0aGUgb3RoZXIgcnF1ZXN0c1xyXG4gICAgICAgICAgICBjb25zdCBjaXR5Q29kZSA9IGRhdGEuaWQ7ICBcclxuICAgICAgICAgICAgYXBwLmdldFBPSXMoY2l0eUNvZGUpO1xyXG4gICAgICAgICAgICBhcHAuZ2V0VG91cnMoY2l0eUNvZGUpO1xyXG4gICAgICAgIH0gXHJcbiAgICB9KTtcclxufVxyXG5cclxuLy8gbWV0aG9kIHRvIGdldCBQT0lzIChwb2ludHMgb2YgaW50ZXJlc3QpO1xyXG5hcHAuZ2V0UE9JcyA9IChjaXR5Q29kZSkgPT4ge1xyXG4gICAgJC5hamF4KHtcclxuICAgICAgICB1cmw6IGBodHRwczovL2FwaS5zeWdpY3RyYXZlbGFwaS5jb20vMS4wL2VuL3BsYWNlcy9saXN0YCxcclxuICAgICAgICBtZXRob2Q6ICdHRVQnLFxyXG4gICAgICAgIGRhdGFUeXBlOiAnanNvbicsXHJcbiAgICAgICAgaGVhZGVyczoge1xyXG4gICAgICAgICAgICAneC1hcGkta2V5JzogJ3p6aUpZY2psbUU4TGJXSGR2VTV2QzhVY1NGdktFUHNDM25rQWw3ZUsnXHJcbiAgICAgICAgfSxcclxuICAgICAgICBkYXRhOiB7XHJcbiAgICAgICAgICAgICd0YWdzX25vdCc6ICdBaXJwb3J0JyxcclxuICAgICAgICAgICAgJ3BhcmVudHMnOiBjaXR5Q29kZSxcclxuICAgICAgICAgICAgJ2xldmVsJzogJ3BvaScsXHJcbiAgICAgICAgICAgICdsaW1pdCc6IDIwLFxyXG4gICAgICAgIH1cclxuICAgIH0pLnRoZW4oKHJlcyk9PiB7XHJcbiAgICAgICAgY29uc3QgcG9pbnRzID0gcmVzLmRhdGEucGxhY2VzO1xyXG5cclxuICAgICAgICAvLyB3ZSBvbmx5IHdhbnQgcmVzdWx0cyB0aGF0IGhhdmUgYW4gaW1hZ2UgYW5kIGEgZGVzY3JpcHRpb25zIChwZXJleClcclxuICAgICAgICBjb25zdCBmaWx0ZXJlZFBvaW50cyA9IHBvaW50cy5maWx0ZXIoKHBsYWNlKT0+IHtcclxuICAgICAgICAgICAgcmV0dXJuIHBsYWNlLnRodW1ibmFpbF91cmwgJiYgcGxhY2UucGVyZXhcclxuICAgICAgICB9KTtcclxuXHJcbiAgICAgICAgLy8gaWYgdGhlcmUgYXJlIG5vIHJlc3VsdHMgdGhhdCBoYXZlIGFuIGltYWdlIGFuZCBhIGRlc2NyaXB0aW9uLCBjYWxsIHRoZSBkaXNwbGF5RXJyb3IgZnVuY3Rpb25cclxuICAgICAgICBpZiAoZmlsdGVyZWRQb2ludHMubGVuZ3RoID09PSAwKSB7XHJcbiAgICAgICAgICAgIGFwcC5kaXNwbGF5RXJyb3IoJ3BvaScsICdwb2ludHMgb2YgaW50ZXJlc3QnKTtcclxuICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAvLyB0YWtlIHRoZSBmaXJzdCAzIGl0ZW1zIGFuZCBwdXNoIHRoZWlyIHByb3BlcnRpZXMgb250byB0aGUgYXBwLlBPSXMgb2JqZWN0XHJcbiAgICAgICAgICAgIGZpbHRlcmVkUG9pbnRzLmZvckVhY2goKHBvaW50KT0+IHtcclxuICAgICAgICAgICAgICAgIGNvbnN0IHBsYWNlID0ge1xyXG4gICAgICAgICAgICAgICAgICAgICduYW1lJzogcG9pbnQubmFtZSxcclxuICAgICAgICAgICAgICAgICAgICAnZGVzY3JpcHRpb24nOiBwb2ludC5wZXJleCxcclxuICAgICAgICAgICAgICAgICAgICAncGhvdG8nOiBwb2ludC50aHVtYm5haWxfdXJsLFxyXG4gICAgICAgICAgICAgICAgfTtcclxuICAgICAgICAgICAgICAgIGFwcC5QT0lzLnB1c2gocGxhY2UpO1xyXG4gICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgYXBwLmRpc3BsYXlQT0lzKGFwcC5QT0lzKTtcclxuICAgICAgICB9XHJcbiAgICB9KTtcclxufVxyXG4vL21ldGhvZCB0byBnZXQgY2xvc2VzdCBhaXJwb3J0XHJcbmFwcC5nZXRBaXJwb3J0cyA9IChsYXQsIGxuZykgPT4ge1xyXG4gICAgJC5hamF4KHtcclxuICAgICAgICB1cmw6IGBodHRwczovL2FwaS5zeWdpY3RyYXZlbGFwaS5jb20vMS4wL2VuL3BsYWNlcy9saXN0YCxcclxuICAgICAgICBtZXRob2Q6ICdHRVQnLFxyXG4gICAgICAgIGRhdGFUeXBlOiAnanNvbicsXHJcbiAgICAgICAgaGVhZGVyczoge1xyXG4gICAgICAgICAgICAneC1hcGkta2V5JzogJ3p6aUpZY2psbUU4TGJXSGR2VTV2QzhVY1NGdktFUHNDM25rQWw3ZUsnXHJcbiAgICAgICAgfSxcclxuICAgICAgICBkYXRhOiB7XHJcbiAgICAgICAgICAgICdsb2NhdGlvbic6IGAke2xhdH0sJHtsbmd9YCxcclxuICAgICAgICAgICAgJ3RhZ3MnOiAnQWlycG9ydCcsXHJcbiAgICAgICAgfVxyXG4gICAgfSkgLnRoZW4gKChyZXMpID0+IHtcclxuICAgICAgICAvLyBwdXNoIHRoZSBwcm9wZXJ0aWVzIG9udG8gYXBwLmFpcnBvcnQgb2JqZWN0XHJcbiAgICAgICAgYXBwLmFpcnBvcnQubmFtZSA9IHJlcy5kYXRhLnBsYWNlc1swXS5uYW1lO1xyXG4gICAgICAgIGFwcC5haXJwb3J0LmRlc2NyaXB0aW9uID0gcmVzLmRhdGEucGxhY2VzWzBdLnBlcmV4O1xyXG4gICAgICAgIGFwcC5haXJwb3J0LnBob3RvID0gcmVzLmRhdGEucGxhY2VzWzBdLnRodW1ibmFpbF91cmw7XHJcblxyXG4gICAgICAgIC8vIGNhbGwgZGlzcGxheUFpcnBvcnRzIHVzaW5nIHByb3BlcnRpZXMgZnJvbSBhamF4IHJlcXVlc3RcclxuICAgICAgICBhcHAuZGlzcGxheUFpcnBvcnRzKGFwcC5haXJwb3J0KTtcclxuICAgIH0pO1xyXG59XHJcblxyXG4vLyBtZXRob2QgdG8gZ2V0IGxhbmd1YWdlXHJcbmFwcC5nZXRMYW5ndWFnZSA9IChjb3VudHJ5KSA9PiB7XHJcbiAgICAkLmFqYXgoe1xyXG4gICAgICAgIHVybDogYGh0dHBzOi8vcmVzdGNvdW50cmllcy5ldS9yZXN0L3YyL25hbWUvJHtjb3VudHJ5fWAsXHJcbiAgICAgICAgbWV0aG9kOiAnR0VUJyxcclxuICAgICAgICBkYXRhVHlwZTogJ2pzb24nLFxyXG4gICAgICAgIGRhdGE6IHtcclxuICAgICAgICAgICAgZnVsbFRleHQ6IHRydWVcclxuICAgICAgICB9XHJcbiAgICB9KSAudGhlbigocmVzKSA9PiB7XHJcbiAgICAgICAgY29uc29sZS5sb2cocmVzKTtcclxuICAgICAgICBhcHAubGFuZ3VhZ2UucHJpbWFyeSA9IHJlc1swXS5sYW5ndWFnZXNbMF0ubmFtZTtcclxuICAgICAgICBpZiAocmVzWzBdLmxhbmd1YWdlcy5sZW5ndGggPiAxKSB7XHJcbiAgICAgICAgICAgIGFwcC5sYW5ndWFnZS5zZWNvbmRhcnkgPSByZXNbMF0ubGFuZ3VhZ2VzWzFdLm5hbWU7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIGFwcC5kaXNwbGF5TGFuZ3VhZ2UoYXBwLmxhbmd1YWdlKTtcclxuICAgIH0pO1xyXG5cclxufVxyXG5cclxuLy8gXHJcbmFwcC5nZXRUb3VycyA9IChjaXR5Q29kZSkgPT4ge1xyXG4gICAgJC5hamF4KHtcclxuICAgICAgICB1cmw6IGBodHRwczovL2FwaS5zeWdpY3RyYXZlbGFwaS5jb20vMS4wL2VuL3RvdXJzL3ZpYXRvcmAsXHJcbiAgICAgICAgbWV0aG9kOiAnR0VUJyxcclxuICAgICAgICBkYXRhVHlwZTogJ2pzb24nLFxyXG4gICAgICAgIGhlYWRlcnM6IHtcclxuICAgICAgICAgICAgJ3gtYXBpLWtleSc6ICd6emlKWWNqbG1FOExiV0hkdlU1dkM4VWNTRnZLRVBzQzNua0FsN2VLJ1xyXG4gICAgICAgIH0sXHJcbiAgICAgICAgZGF0YToge1xyXG4gICAgICAgICAgICAncGFyZW50X3BsYWNlX2lkJzogY2l0eUNvZGVcclxuICAgICAgICB9XHJcbiAgIH0pLnRoZW4oKHJlcykgPT4ge1xyXG4gICAgICAgIGNvbnNvbGUubG9nKHJlcyk7XHJcbiAgICAgICAgY29uc3QgbGlzdCA9IHJlcy5kYXRhLnRvdXJzO1xyXG4gICAgICAgIGNvbnNvbGUubG9nKHRvdXJzKTtcclxuICAgICAgICBjb25zdCB0b3VycyA9IGxpc3QuZmlsdGVyKChwbGFjZSk9PiB7XHJcbiAgICAgICAgICAgIHJldHVybiBwbGFjZS5waG90b191cmwgJiYgcGxhY2UudXJsXHJcbiAgICAgICAgfSk7XHJcbiAgICAgICAgaWYgKHRvdXJzLmxlbmd0aCA9PT0gMCkge1xyXG4gICAgICAgICAgICBhcHAuZGlzcGxheUVycm9yKCd0b3VycycsICd0b3VycycpO1xyXG4gICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgIGZvciAobGV0IGkgPSAwOyBpIDwgdG91cnMubGVuZ3RoOyBpICsrKSB7XHJcbiAgICAgICAgICAgICAgICBjb25zdCB0b3VyID0ge1xyXG4gICAgICAgICAgICAgICAgICAgIG5hbWU6IHRvdXJzW2ldLnRpdGxlLFxyXG4gICAgICAgICAgICAgICAgICAgIHBob3RvOiB0b3Vyc1tpXS5waG90b191cmwsXHJcbiAgICAgICAgICAgICAgICAgICAgdXJsOiB0b3Vyc1tpXS51cmxcclxuICAgICAgICAgICAgICAgIH07XHJcbiAgICAgICAgICAgICAgICBhcHAudG91cnMucHVzaCh0b3VyKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBjb25zb2xlLmxvZyhhcHAudG91cnMpO1xyXG4gICAgICAgICAgICBhcHAuZGlzcGxheVRvdXJzKGFwcC50b3Vycyk7XHJcbiAgICAgICAgfVxyXG4gICAgfSk7XHJcbn1cclxuXHJcbmFwcC5nZXRDdXJyZW5jeSA9IChjb3VudHJ5Q29kZSkgPT4ge1xyXG4gICAgJC5hamF4KHtcclxuICAgICAgICB1cmw6IGBodHRwczovL3Jlc3Rjb3VudHJpZXMuZXUvcmVzdC92Mi9uYW1lLyR7Y291bnRyeUNvZGV9YCxcclxuICAgICAgICBtZXRob2Q6ICdHRVQnLFxyXG4gICAgICAgIGRhdGFUeXBlOiAnanNvbicsXHJcbiAgICAgICAgZGF0YToge1xyXG4gICAgICAgICAgICBmdWxsVGV4dDogdHJ1ZVxyXG4gICAgICAgIH1cclxuICAgIH0pLnRoZW4oKHJlcykgPT4ge1xyXG4gICAgICAgIGFwcC5jdXJyZW5jeS5jb2RlID0gcmVzWzBdLmN1cnJlbmNpZXNbMF0uY29kZTtcclxuICAgICAgICBhcHAuY3VycmVuY3kuc3ltYm9sID0gcmVzWzBdLmN1cnJlbmNpZXNbMF0uc3ltYm9sO1xyXG4gICAgICAgIGFwcC5kaXNwbGF5Q3VycmVuY3koYXBwLmN1cnJlbmN5KTtcclxuICAgIH0pO1xyXG59ICAgIFxyXG5cclxuYXBwLmNvbnZlcnRDdXJyZW5jeSA9ICh1c2VyQ3VycmVuY3ksIGRlc3RpbmF0aW9uQ3VycmVuY3kpID0+IHtcclxuICAgICQuYWpheCh7XHJcbiAgICAgICAgdXJsOiBgaHR0cHM6Ly9mcmVlLmN1cnJlbmN5Y29udmVydGVyYXBpLmNvbS9hcGkvdjYvY29udmVydGAsXHJcbiAgICAgICAgbWV0aG9kOiAnR0VUJyxcclxuICAgICAgICBkYXRhVHlwZTogJ2pzb24nLFxyXG4gICAgICAgIGRhdGE6IHtcclxuICAgICAgICAgICAgcTogYCR7dXNlckN1cnJlbmN5fV8ke2Rlc3RpbmF0aW9uQ3VycmVuY3l9LCR7ZGVzdGluYXRpb25DdXJyZW5jeX1fJHt1c2VyQ3VycmVuY3l9YCxcclxuICAgICAgICAgICAgY29tcGFjdDogJ3VsdHJhJ1xyXG4gICAgICAgIH1cclxuICAgIH0pLnRoZW4oKHJlcykgPT4ge1xyXG4gICAgICAgIGNvbnNvbGUubG9nKHJlcyk7XHJcbiAgICAgICAgYXBwLmN1cnJlbmN5LmV4Y2hhbmdlUmF0ZSA9IHJlc1tgJHt1c2VyQ3VycmVuY3l9XyR7ZGVzdGluYXRpb25DdXJyZW5jeX1gXTtcclxuICAgICAgICBjb25zb2xlLmxvZyhhcHAuY3VycmVuY3kuZXhjaGFuZ2VSYXRlKTtcclxuXHJcbiAgICAgICAgJCgnI2N1cnJlbmN5JykuYXBwZW5kKGA8aDI+JDEgJHt1c2VyQ3VycmVuY3l9ID0gJHthcHAuY3VycmVuY3kuc3ltYm9sfSAke2FwcC5jdXJyZW5jeS5leGNoYW5nZVJhdGUudG9GaXhlZCgyKX0gJHtkZXN0aW5hdGlvbkN1cnJlbmN5fTwvaDI+YClcclxuXHJcbiAgICB9KTtcclxufVxyXG5cclxuYXBwLmRpc3BsYXlFcnJvciA9IChkaXZJRCwgdG9waWMpID0+IHtcclxuICAgIGNvbnN0IHRpdGxlID0gYDxoMT4ke3RvcGljfTwvaDE+YDtcclxuICAgIGNvbnNvbGUubG9nKCdlcnJvcicpO1xyXG4gICAgJChgIyR7ZGl2SUR9YCkuYXBwZW5kKHRpdGxlLCBgPGgyPlNvcnJ5LCB3ZSBkb24ndCBoYXZlIGRldGFpbGVkIGluZm9ybWF0aW9uIGFib3V0ICR7dG9waWN9IGluIHRoaXMgYXJlYS4gVHJ5IHlvdXIgc2VhcmNoIGFnYWluIGluIGEgbmVhcmJ5IGNpdHkgb3IgcmVsYXRlZCBhcmVhLjwvaDI+YCk7XHJcbn1cclxuXHJcblxyXG5hcHAuZGlzcGxheUN1cnJlbmN5ID0gKG9iamVjdCkgPT4ge1xyXG4gICAgY29uc3QgdGl0bGUgPSBgPGgzPkN1cnJlbmN5PC9oMz5gO1xyXG4gICAgY29uc3QgaHRtbCA9IGA8aDI+VGhlIGN1cnJlbmN5IHVzZWQgaXMgJHtvYmplY3Quc3ltYm9sfSAke29iamVjdC5jb2RlfTwvaDI+YDtcclxuICAgIGNvbnN0IGlucHV0ID0gYDxmb3JtIGlkPVwidXNlckN1cnJlbmN5XCI+PGlucHV0IGNsYXNzPVwidXNlckN1cnJlbmN5ICB0eXBlPVwic2VhcmNoXCIgaWQ9XCJ1c2VyXCIgcGxhY2Vob2xkZXI9XCJFbnRlciB5b3VyIGxvY2F0aW9uLlwiPjwvZm9ybT5gO1xyXG4gICAgJCgnI2N1cnJlbmN5JykuYXBwZW5kKHRpdGxlLGh0bWwsIGlucHV0KTtcclxuICAgIGFwcC5nZXRVc2VySW5mbygpO1xyXG59XHJcblxyXG5hcHAuZ2V0VXNlckluZm8gPSAoKSA9PiB7XHJcbiAgICBhcHAuaW5pdEF1dG9jb21wbGV0ZSgndXNlcicpO1xyXG4gICAgJCgnI3VzZXJDdXJyZW5jeScpLm9uKCdzdWJtaXQnLCBmdW5jdGlvbihlKSB7XHJcbiAgICAgICAgZS5wcmV2ZW50RGVmYXVsdCgpO1xyXG4gICAgICAgIGNvbnN0IHVzZXJMb2NhdGlvbiA9ICQoJyN1c2VyJykudmFsKCk7XHJcbiAgICAgICAgYXBwLmdldFVzZXJMb2NhdGlvbih1c2VyTG9jYXRpb24pO1xyXG4gICAgfSk7XHJcbn1cclxuXHJcbmFwcC5nZXRVc2VyTG9jYXRpb24gPSAobG9jYXRpb24pID0+IHtcclxuICAgIG5ldyBnb29nbGUubWFwcy5wbGFjZXMuQXV0b2NvbXBsZXRlKGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCd1c2VyJykpO1xyXG4gICAgY29uc3QgZ2VvY29kZXIgPSBuZXcgZ29vZ2xlLm1hcHMuR2VvY29kZXIoKTtcclxuICAgIGdlb2NvZGVyLmdlb2NvZGUoe1xyXG4gICAgICAgICdhZGRyZXNzJzogbG9jYXRpb25cclxuICAgIH0sIChyZXN1bHRzLCBzdGF0dXMpID0+IHtcclxuICAgICAgICBpZiAoc3RhdHVzID09IGdvb2dsZS5tYXBzLkdlb2NvZGVyU3RhdHVzLk9LKSB7XHJcbiAgICAgICAgICAgIGNvbnN0IGFkZHJlc3NDb21wb25lbnRzID0gcmVzdWx0c1swXS5hZGRyZXNzX2NvbXBvbmVudHMuZmlsdGVyKChjb21wb25lbnQpID0+IHtcclxuICAgICAgICAgICAgICAgIHJldHVybiBjb21wb25lbnQudHlwZXNbMF0gPT09ICdjb3VudHJ5JztcclxuICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgIGFwcC51c2VyLmNvdW50cnlDb2RlID0gYWRkcmVzc0NvbXBvbmVudHNbMF0uc2hvcnRfbmFtZTtcclxuICAgICAgICAgICAgY29uc29sZS5sb2coYXBwLnVzZXIuY291bnRyeUNvZGUpO1xyXG4gICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgIGFsZXJ0KCdTb3JyeSwgc29tZXRoaW5nIHdlbnQgd3JvbmcuJyArIHN0YXR1cylcclxuICAgICAgICB9XHJcbiAgICBhcHAuZ2V0VXNlckN1cnJlbmN5KGFwcC51c2VyLmNvdW50cnlDb2RlKTtcclxuICAgIH0pOyAgICBcclxufVxyXG5cclxuYXBwLmdldFVzZXJDdXJyZW5jeSA9IChjb3VudHJ5Q29kZSkgPT4ge1xyXG4gICAgJC5hamF4KHtcclxuICAgICAgICB1cmw6IGBodHRwczovL3Jlc3Rjb3VudHJpZXMuZXUvcmVzdC92Mi9uYW1lLyR7Y291bnRyeUNvZGV9YCxcclxuICAgICAgICBtZXRob2Q6ICdHRVQnLFxyXG4gICAgICAgIGRhdGFUeXBlOiAnanNvbicsXHJcbiAgICAgICAgZGF0YToge1xyXG4gICAgICAgICAgICBmdWxsVGV4dDogdHJ1ZVxyXG4gICAgICAgIH1cclxuICAgIH0pLnRoZW4oKHJlcykgPT4ge1xyXG4gICAgICAgIGFwcC51c2VyLmNvZGUgPSByZXNbMF0uY3VycmVuY2llc1swXS5jb2RlO1xyXG4gICAgICAgIGNvbnNvbGUubG9nKGFwcC51c2VyLmNvZGUpO1xyXG4gICAgICAgIGFwcC5jb252ZXJ0Q3VycmVuY3koYXBwLnVzZXIuY29kZSwgYXBwLmN1cnJlbmN5LmNvZGUpO1xyXG4gICAgfSk7XHJcbn1cclxuXHJcblxyXG5hcHAuZGlzcGxheUxhbmd1YWdlID0gKG9iamVjdCkgPT4ge1xyXG4gICAgY29uc29sZS5sb2cob2JqZWN0Lm5hbWUsIG9iamVjdC5uYXRpdmVOYW1lKTtcclxuICAgIGNvbnN0IHRpdGxlID0gYDxoMz5MYW5ndWFnZTwvaDM+YDtcclxuICAgIGNvbnN0IHByaW1hcnkgPSBgPGgyPlByaW1hcnk8L2gyPjxoND4ke29iamVjdC5wcmltYXJ5fTwvaDQ+YDtcclxuICAgIGNvbnN0IHNlY29uZGFyeSA9IGA8aDI+U2Vjb25kYXJ5PC9oMj48aDQ+JHtvYmplY3Quc2Vjb25kYXJ5fTwvaDQ+YDtcclxuICAgICQoJyNsYW5ndWFnZScpLmFwcGVuZCh0aXRsZSwgcHJpbWFyeSlcclxuICAgIGlmIChvYmplY3Quc2Vjb25kYXJ5ICE9PSB1bmRlZmluZWQpIHtcclxuICAgICAgICAkKCcjbGFuZ3VhZ2UnKS5hcHBlbmQoc2Vjb25kYXJ5KTtcclxuICAgIH0gXHJcbn1cclxuXHJcbmFwcC5kaXNwbGF5QWlycG9ydHMgPSAob2JqZWN0KSA9PiB7XHJcbiAgICBjb25zdCB0aXRsZSA9IGA8aDM+Q2xvc2VzdCBBaXJwb3J0PC9oMz5gO1xyXG4gICAgY29uc3QgbmFtZSA9IGA8aDQ+JHtvYmplY3QubmFtZX08L2g0PmA7XHJcbiAgICAvLyBjb25zdCBkZXNjID0gYDxwPiR7b2JqZWN0LmRlc2NyaXB0aW9ufTwvcD5gO1xyXG4gICAgLy8gY29uc3QgcGhvdG8gPSBgPGltZyBzcmM9XCIke29iamVjdC5waG90b31cIi8+YDtcclxuICAgICQoJyNhaXJwb3J0JykuYXBwZW5kKHRpdGxlLCBuYW1lKTtcclxufVxyXG5cclxuLy8gbWV0aG9kIHRvIGRpc3BsYXkgdG91cnNcclxuLy8gaSByZWFsaXplZCB3aGVuIHRoZXJlJ3MgYSBsb3Qgb2YgcmVzdWx0cywgaXQncyBub3QgaWRlYWwgZm9yIG1vYmlsZSB1c2Vyc1xyXG4vLyBzbyBpIHRyaWVkIHNvbWUgc2ltcGxlIFwicGFnaW5hdGlvblwiIHdoZW4gdGhlIHNjcmVlbiB3aWR0aCBpcyBsZXNzIHRoYW4gNjAwcHhcclxuLy8gY3JlYXRlIDIgdmFyaWFibGVzLCBvbmUgdG8gYWN0IGFzIGEgXCJjb3VudGVyXCIgYW5kIG9uZSB0byBkaWN0YXRlIHJlc3VsdHMgcGVyIHBhZ2VcclxuLy8gd2hlbiB1c2VyIGNsaWNrcyAnbG9hZCBtb3JlJywgaXQgYXBwZW5kcyB0aGUgbmV4dCB0aHJlZSByZXN1bHRzLCByZW1vdmVzIHRoZSBidXR0b24sIGFuZCBhcHBlbmRzIGEgbmV3IGJ1dHRvbiBhdCB0aGUgZW5kIG9mIHRoZSBuZXcgcmVzdWx0c1xyXG5hcHAuZGlzcGxheVRvdXJzID0gKGFycmF5KSA9PiB7XHJcbiAgICBjb25zdCB0aXRsZSA9IGA8aDM+VG9wIFRvdXJzPC9oMz5gO1xyXG4gICAgJCgnI3RvdXJzJykuYXBwZW5kKHRpdGxlKTtcclxuICAgIFxyXG4gICAgaWYgKCQod2luZG93KS53aWR0aCgpIDw9IDYwMCkge1x0XHJcbiAgICAgICAgbGV0IGNvdW50ZXIgPSAwO1xyXG4gICAgICAgIGxldCByZXN1bHRzUGVyUGFnZSA9IDM7XHJcbiAgICAgICAgZm9yIChsZXQgaSA9IGNvdW50ZXI7IGkgPCByZXN1bHRzUGVyUGFnZTsgaSsrKSB7XHJcbiAgICAgICAgICAgIGNvbnN0IGRpdiA9ICQoJzxkaXYgY2xhc3M9XCJjbGVhcmZpeCBodnItc2hhZG93XCI+Jyk7XHJcbiAgICAgICAgICAgIGNvbnN0IG5hbWUgPSBgPGgyPiR7YXJyYXlbaV0ubmFtZX08aDI+YFxyXG4gICAgICAgICAgICBjb25zdCBwaG90byA9IGA8aW1nIGNsYXNzPVwiaHZyLWdyb3ctc2hhZG93XCIgc3JjPVwiJHthcnJheVtpXS5waG90b31cIj5gO1xyXG4gICAgICAgICAgICBjb25zdCBsaW5rID0gYDxhIGNsYXNzPVwiaHZyLXVuZGVybGluZS1mcm9tLWNlbnRlclwiIGhyZWY9XCIke2FycmF5LnVybH1cIj5Cb29rIE5vdzwvYT5gO1xyXG5cclxuICAgICAgICAgICAgY29uc3QgdGV4dCA9ICQoYDxkaXY+YCkuYXBwZW5kKG5hbWUsIGxpbmspO1xyXG4gICAgICAgICAgICBkaXYuYXBwZW5kKHBob3RvLCB0ZXh0KTtcclxuICAgICAgICAgICAgJCgnI3RvdXJzJykuYXBwZW5kKGRpdik7XHJcbiAgICAgICAgfSAgICBcclxuXHJcbiAgICAgICAgY29uc3QgbG9hZE1vcmUgPSBgPGJ1dHRvbiBjbGFzcz1cImxvYWRNb3JlIGh2ci1ncm93LXNoYWRvd1wiPkxvYWQgTW9yZTwvYnV0dG9uPmA7XHJcbiAgICAgICAgJCgnI3RvdXJzJykuYXBwZW5kKGxvYWRNb3JlKTtcclxuICAgICAgICAkKCcjdG91cnMnKS5vbignY2xpY2snLCAnLmxvYWRNb3JlJywgZnVuY3Rpb24oKSB7XHJcbiAgICAgICAgICAgIHRoaXMucmVtb3ZlKCk7XHJcbiAgICAgICAgICAgIGNvdW50ZXIrPTM7XHJcbiAgICAgICAgICAgIGZvciAobGV0IGkgPSBjb3VudGVyOyBpIDwgKGNvdW50ZXIgKyByZXN1bHRzUGVyUGFnZSk7IGkrKykge1xyXG4gICAgICAgICAgICAgICAgY29uc3QgZGl2ID0gJCgnPGRpdiBjbGFzcz1cImNsZWFyZml4IGh2ci1zaGFkb3dcIj4nKTtcclxuICAgICAgICAgICAgICAgIGNvbnN0IG5hbWUgPSBgPGgyPiR7YXJyYXlbaV0ubmFtZX08aDI+YFxyXG4gICAgICAgICAgICAgICAgY29uc3QgcGhvdG8gPSBgPGltZyBjbGFzcz1cImh2ci1ncm93LXNoYWRvd1wiICBzcmM9XCIke2FycmF5W2ldLnBob3RvfVwiPmA7XHJcbiAgICAgICAgICAgICAgICBjb25zdCBsaW5rID0gYDxhIGNsYXNzPVwiaHZyLXVuZGVybGluZS1mcm9tLWNlbnRlclwiIGhyZWY9XCIke2FycmF5LnVybH1cIj5Cb29rIE5vdzwvYT5gO1xyXG4gICAgICAgICAgICAgICAgXHJcbiAgICAgICAgICAgICAgICBjb25zdCB0ZXh0ID0gJChgPGRpdj5gKS5hcHBlbmQobmFtZSwgbGluayk7XHJcbiAgICAgICAgICAgICAgICBkaXYuYXBwZW5kKHBob3RvLCB0ZXh0KTtcclxuICAgICAgICAgICAgICAgICQoJyN0b3VycycpLmFwcGVuZChkaXYpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICQoJyN0b3VycycpLmFwcGVuZChsb2FkTW9yZSk7XHJcbiAgICAgICAgfSk7XHJcblxyXG4gICAgICAgIC8vIGlmIHNjcmVlbiB3aWR0aCBpcyBub3QgbGVzcyB0aGFuIDYwMHB4LCBhcHBlbmQgZWxlbWVudHMgbm9ybWFsbHlcclxuXHR9IGVsc2Uge1xyXG4gICAgICAgIGFycmF5LmZvckVhY2goKGl0ZW0pID0+IHtcclxuICAgICAgICAgICAgY29uc3QgZGl2ID0gJCgnPGRpdiBjbGFzcz1cImNsZWFyZml4IGh2ci1zaGFkb3dcIj4nKTtcclxuICAgICAgICAgICAgY29uc3QgbmFtZSA9IGA8aDI+JHtpdGVtLm5hbWV9PGgyPmA7XHJcbiAgICAgICAgICAgIGNvbnN0IHBob3RvID0gYDxpbWcgY2xhc3M9XCJodnItZ3Jvdy1zaGFkb3dcIiBzcmM9XCIke2l0ZW0ucGhvdG99XCI+YDtcclxuICAgICAgICAgICAgY29uc3QgbGluayA9IGA8YSBjbGFzcz1cImh2ci11bmRlcmxpbmUtZnJvbS1jZW50ZXJcIiBocmVmPVwiJHtpdGVtLnVybH1cIj5Cb29rIE5vdzwvYT5gO1xyXG4gICAgICAgICAgICBjb25zdCB0ZXh0ID0gJCgnPGRpdj4nKS5hcHBlbmQobmFtZSwgbGluayk7XHJcbiAgICAgICAgICAgIGRpdi5hcHBlbmQocGhvdG8sIHRleHQpO1xyXG4gICAgICAgICAgICAkKCcjdG91cnMnKS5hcHBlbmQoZGl2KTtcclxuICAgICAgICB9KTtcclxuICAgIH1cclxufVxyXG5cclxuLy8gbWV0aG9kIHRvIGRpc3BsYXkgcG9pbnRzIG9mIGludGVyZXN0XHJcbi8vIHNhbWUgXCJwYWdpbmF0aW9uXCIgc3lzdGVtIGFzIHRvdXJzXHJcbmFwcC5kaXNwbGF5UE9JcyA9IChhcnJheSkgPT4ge1xyXG4gICAgY29uc3QgdGl0bGUgPSBgPGgzPlBvaW50cyBvZiBJbnRlcmVzdDwvaDM+YDtcclxuICAgICQoJyNwb2knKS5hcHBlbmQodGl0bGUpO1xyXG4gICAgaWYgKCQod2luZG93KS53aWR0aCgpIDw9IDYwMCkge1x0XHJcbiAgICAgICAgbGV0IGNvdW50ZXIgPSAwO1xyXG4gICAgICAgIGxldCByZXN1bHRzUGVyUGFnZSA9IDM7XHJcbiAgICAgICAgZm9yIChsZXQgaSA9IGNvdW50ZXI7IGkgPCByZXN1bHRzUGVyUGFnZTsgaSsrKSB7XHJcbiAgICAgICAgICAgIGNvbnN0IGRpdiA9ICQoYDxkaXYgY2xhc3M9XCJjbGVhcmZpeCBodnItc2hhZG93XCI+YCk7XHJcbiAgICAgICAgICAgIGNvbnN0IG5hbWUgPSBgPGgyPiR7YXJyYXlbaV0ubmFtZX08aDI+YDtcclxuICAgICAgICAgICAgY29uc3QgZGVzYyA9IGA8cD4ke2FycmF5W2ldLmRlc2NyaXB0aW9ufTwvcD5gO1xyXG4gICAgICAgICAgICBjb25zdCBwaG90byA9IGA8aW1nIGNsYXNzPVwiaHZyLWdyb3ctc2hhZG93XCIgc3JjPVwiJHthcnJheVtpXS5waG90b31cIj5gO1xyXG4gICAgICAgICAgICBjb25zdCB0ZXh0ID0gJCgnPGRpdj4nKS5hcHBlbmQobmFtZSwgZGVzYyk7XHJcblxyXG4gICAgICAgICAgICBkaXYuYXBwZW5kKHBob3RvLCB0ZXh0KTtcclxuICAgICAgICAgICAgJCgnI3BvaScpLmFwcGVuZChkaXYpO1xyXG4gICAgICAgIH0gICAgXHJcblxyXG4gICAgICAgIGNvbnN0IGxvYWRNb3JlID0gYDxidXR0b24gY2xhc3M9XCJsb2FkTW9yZSBodnItZ3Jvdy1zaGFkb3dcIj5Mb2FkIE1vcmU8L2J1dHRvbj5gO1xyXG4gICAgICAgICQoJyNwb2knKS5hcHBlbmQobG9hZE1vcmUpO1xyXG5cclxuICAgICAgICAkKCcjcG9pJykub24oJ2NsaWNrJywgJy5sb2FkTW9yZScsIGZ1bmN0aW9uKCkge1xyXG4gICAgICAgICAgICB0aGlzLnJlbW92ZSgpO1xyXG4gICAgICAgICAgICBjb3VudGVyKz0zO1xyXG4gICAgICAgICAgICBmb3IgKGxldCBpID0gY291bnRlcjsgaSA8IChjb3VudGVyICsgcmVzdWx0c1BlclBhZ2UpOyBpKyspIHtcclxuICAgICAgICAgICAgICAgIGNvbnN0IGRpdiA9ICQoYDxkaXYgY2xhc3M9XCJjbGVhcmZpeCBodnItc2hhZG93XCI+YCk7XHJcbiAgICAgICAgICAgICAgICBjb25zdCBuYW1lID0gYDxoMj4ke2FycmF5W2ldLm5hbWV9PGgyPmA7XHJcbiAgICAgICAgICAgICAgICBjb25zdCBkZXNjID0gYDxwPiR7YXJyYXlbaV0uZGVzY3JpcHRpb259PC9wPmA7XHJcbiAgICAgICAgICAgICAgICBjb25zdCBwaG90byA9IGA8aW1nIGNsYXNzPVwiaHZyLWdyb3ctc2hhZG93XCIgc3JjPVwiJHthcnJheVtpXS5waG90b31cIj5gO1xyXG4gICAgICAgICAgICAgICAgY29uc3QgdGV4dCA9ICQoJzxkaXY+JykuYXBwZW5kKG5hbWUsIGRlc2MpO1xyXG4gICAgXHJcbiAgICAgICAgICAgICAgICBkaXYuYXBwZW5kKHBob3RvLCB0ZXh0KTtcclxuICAgICAgICAgICAgICAgICQoJyNwb2knKS5hcHBlbmQoZGl2KTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAkKCcjcG9pJykuYXBwZW5kKGxvYWRNb3JlKTtcclxuICAgICAgICB9KTtcclxuICAgICAgICAvLyBlbHNlIGp1c3QgYXBwZW5kIGFsbCB0aGUgcmVzdWx0cyBub3JtYWxseVxyXG5cdH0gZWxzZSB7ICAgIFxyXG4gICAgICAgIGFycmF5LmZvckVhY2goKGl0ZW0pID0+IHtcclxuICAgICAgICAgICAgY29uc3QgZGl2ID0gJChgPGRpdiBjbGFzcz1cImNsZWFyZml4IGh2ci1zaGFkb3dcIj5gKTtcclxuICAgICAgICAgICAgY29uc3QgbmFtZSA9IGA8aDI+JHtpdGVtLm5hbWV9PGgyPmA7XHJcbiAgICAgICAgICAgIGNvbnN0IGRlc2MgPSBgPHA+JHtpdGVtLmRlc2NyaXB0aW9ufTwvcD5gO1xyXG4gICAgICAgICAgICBjb25zdCBwaG90byA9IGA8aW1nIGNsYXNzPVwiaHZyLWdyb3ctc2hhZG93XCIgc3JjPVwiJHtpdGVtLnBob3RvfVwiPmA7XHJcbiAgICAgICAgICAgIGNvbnN0IHRleHQgPSAkKCc8ZGl2PicpLmFwcGVuZChuYW1lLCBkZXNjKTtcclxuICAgICAgICAgICAgZGl2LmFwcGVuZChwaG90bywgdGV4dCk7XHJcbiAgICAgICAgICAgICQoJyNwb2knKS5hcHBlbmQoZGl2KTtcclxuICAgICAgICB9KTtcclxuICAgIH0gICAgXHJcbn1cclxuXHJcbmFwcC5kaXNwbGF5V2VhdGhlciA9IChvYmplY3QpID0+IHtcclxuICAgIGNvbnN0IHRpdGxlID0gYDxoMz5XZWF0aGVyPC9oMz5gO1xyXG4gICAgY29uc3QgaWNvbiA9IGA8Y2FudmFzIGlkPVwiJHtvYmplY3QuaWNvbn1cIiB3aWR0aD1cIjgwXCIgaGVpZ2h0PVwiODBcIj48L2NhbnZhcz5gO1xyXG4gICAgY29uc3QgaHRtbCA9IGA8aDI+Q3VycmVudGx5OjwvaDI+IFxyXG4gICAgPGg0PiR7b2JqZWN0LmN1cnJlbnRUZW1wfTwvaDQ+XHJcbiAgICAgICAgPHAgY2xhc3M9XCJ3ZWF0aGVyVGV4dFwiPiR7b2JqZWN0LmNvbmRpdGlvbnN9PC9wPmBcclxuICAgICQoJyN3ZWF0aGVyJykuYXBwZW5kKHRpdGxlLCBpY29uLCBodG1sKTtcclxuICAgIGFwcC5sb2FkSWNvbnMoKTtcclxufVxyXG5cclxuYXBwLnJhbmRvbUhlcm8gPSAoKSA9PiB7XHJcbiAgICBsZXQgaSA9IE1hdGguZmxvb3IoTWF0aC5yYW5kb20oKSAqIDUpICsgMVxyXG4gICAgY29uc29sZS5sb2coaSk7XHJcbiAgICAkKCcuc3BsYXNoUGFnZScpLmNzcyh7XHJcbiAgICAgICAgJ2JhY2tncm91bmQnOiBgbGluZWFyLWdyYWRpZW50KHJnYmEoMCwwLDAsMC41KSwgcmdiYSgwLDAsMCwwLjUpKSwgdXJsKFwiLi4vLi4vcHVibGljL2Fzc2V0cy9oZXJvJHtpfS5qcGdcIilgLFxyXG4gICAgICAgICdiYWNrZ3JvdW5kLXBvc2l0aW9uJzogJ2NlbnRlcicsXHJcblx0ICAgICdiYWNrZ3JvdW5kLXNpemUnOiAnY292ZXInXHRcclxuICAgIH0pO1xyXG59XHJcblxyXG5hcHAubG9hZEljb25zID0gKCkgPT4ge1xyXG4gICAgdmFyIGljb25zID0gbmV3IFNreWNvbnMoe1wiY29sb3JcIjogXCJibGFja1wifSk7XHJcbiAgICBpY29ucy5zZXQoXCJjbGVhci1kYXlcIiwgU2t5Y29ucy5DTEVBUl9EQVkpO1xyXG4gICAgaWNvbnMuc2V0KFwiY2xlYXItbmlnaHRcIiwgU2t5Y29ucy5DTEVBUl9OSUdIVCk7XHJcbiAgICBpY29ucy5zZXQoXCJwYXJ0bHktY2xvdWR5LWRheVwiLCBTa3ljb25zLlBBUlRMWV9DTE9VRFlfREFZKTtcclxuICAgIGljb25zLnNldChcInBhcnRseS1jbG91ZHktbmlnaHRcIiwgU2t5Y29ucy5QQVJUTFlfQ0xPVURZX05JR0hUKTtcclxuICAgIGljb25zLnNldChcImNsb3VkeVwiLCBTa3ljb25zLkNMT1VEWSk7XHJcbiAgICBpY29ucy5zZXQoXCJyYWluXCIsIFNreWNvbnMuUkFJTik7XHJcbiAgICBpY29ucy5zZXQoXCJzbGVldFwiLCBTa3ljb25zLlNMRUVUKTtcclxuICAgIGljb25zLnNldChcInNub3dcIiwgU2t5Y29ucy5TTk9XKTtcclxuICAgIGljb25zLnNldChcIndpbmRcIiwgU2t5Y29ucy5XSU5EKTtcclxuICAgIGljb25zLnNldChcImZvZ1wiLCBTa3ljb25zLkZPRyk7XHJcbiAgICBpY29ucy5wbGF5KCk7XHJcbn1cclxuXHJcbmFwcC5ldmVudHMgPSAoKSA9PiB7XHJcbiAgICBhcHAuaW5pdEF1dG9jb21wbGV0ZSgnZGVzdGluYXRpb24nKTtcclxuICAgICQoJ2Zvcm0nKS5vbignc3VibWl0JywgKGUpID0+IHtcclxuICAgICAgICAkKCcjc3BsYXNoUGFnZScpLnRvZ2dsZShmYWxzZSk7XHJcbiAgICAgICAgJCgnI2NvbnRlbnRQYWdlJykudG9nZ2xlKHRydWUpO1xyXG4gICAgICAgICQoJ2Zvcm0nKS5yZW1vdmVDbGFzcygnc3BsYXNoU2VhcmNoRm9ybScpO1xyXG4gICAgICAgICQoJyNkZXN0aW5hdGlvbicpLnJlbW92ZUNsYXNzKCdzcGxhc2hTZWFyY2hCYXInKTtcclxuICAgICAgICAkKCdmb3JtJykuYWRkQ2xhc3MoJ2NvbnRlbnRTZWFyY2hGb3JtJyk7XHJcbiAgICAgICAgJCgnI2Rlc3RpbmF0aW9uJykuYWRkQ2xhc3MoJ2NvbnRlbnRTZWFyY2hCYXInKTtcclxuICAgICAgICBlLnByZXZlbnREZWZhdWx0KCk7XHJcbiAgICAgICAgJCgnZGl2JykuZW1wdHkoKTtcclxuICAgICAgICBjb25zdCBkZXN0aW5hdGlvbiA9ICQoJyNkZXN0aW5hdGlvbicpLnZhbCgpO1xyXG4gICAgICAgIGlmIChkZXN0aW5hdGlvbi5sZW5ndGggPiAwKSB7XHJcbiAgICAgICAgICAgICQoJyNkZXN0aW5hdGlvbk5hbWUnKS50ZXh0KGRlc3RpbmF0aW9uKTtcclxuICAgICAgICAgICAgYXBwLmdldERlc3RpbmF0aW9uSW5mbyhkZXN0aW5hdGlvbik7XHJcbiAgICAgICAgfVxyXG4gICAgICAgICQoJyNkZXN0aW5hdGlvbicpLnZhbCgnJyk7XHJcbiAgICAgICAgYXBwLmRlc3RpbmF0aW9uID0ge307XHJcbiAgICAgICAgYXBwLndlYXRoZXIgPSB7fTtcclxuICAgICAgICBhcHAuY3VycmVuY3k9IHt9O1xyXG4gICAgICAgIGFwcC5QT0lzID0gW107XHJcbiAgICAgICAgYXBwLmV4Y2hhbmdlUmF0ZTtcclxuICAgICAgICBhcHAudG91cnMgPSBbXTtcclxuICAgICAgICBhcHAuYWlycG9ydCA9IHt9O1xyXG4gICAgICAgIGFwcC5sYW5ndWFnZXMgPSB7fTtcclxuICAgIH0pO1xyXG59XHJcblxyXG5hcHAuaW5pdCA9ICgpID0+IHtcclxuICAgIGFwcC5yYW5kb21IZXJvKCk7XHJcbiAgICBhcHAuaW5pdEF1dG9jb21wbGV0ZSgnZGVzdGluYXRpb24nKTtcclxuICAgICQoJyNjb250ZW50UGFnZScpLnRvZ2dsZShmYWxzZSk7XHJcbiAgICBhcHAuZXZlbnRzKCk7XHJcbn1cclxuXHJcbiQoZnVuY3Rpb24gKCkge1xyXG4gICAgY29uc29sZS5sb2coXCJyZWFkeSFcIik7XHJcbiAgICBhcHAuaW5pdCgpO1xyXG59KTsiXX0=
