// get user's current location
// get location user wants to travel to
// pass user location into Google maps geocoder to get lat and lng coords
// pass user desired location into Google geocoder to get lat and lng coords
// pass city info and call weather API and get current weather
// pass city info and call zomato API and get top 3 random restaurants 
// pass city info into 


// create empty object to store all methods
const app = {};

//user info
app.user = {};
app.destination = {};
app.weather = {};

// display info
app.currency= {};
app.POIs = [];
app.exchangeRate;
app.restaurants = []


// get user's current location
// most of the other APIs we are requesting data from accept location info in the form of lat lng coords
// so we pass user location into Google  geocoder to get lat and lng coords to use in other API requests
app.initAutocomplete = (id) => {
    new google.maps.places.Autocomplete(document.getElementById(id));
}

app.getUserInfo = (location, location2) => {
    const geocoder = new google.maps.Geocoder();
    geocoder.geocode({
        'address': location
    },
    (results, status) => {
        if (status == google.maps.GeocoderStatus.OK) {
            const addressComponents = results[0].address_components.filter((component) => {
                return component.types[0] === 'country';
            });
            app.user.countryCode = addressComponents[0].short_name;
            app.user.countryName = addressComponents[0].long_name;
            app.user.lat = results[0].geometry.location.lat();
            app.user.lng = results[0].geometry.location.lng();
            // console.log(object.country);
            // console.log(object.lat, object.lng);
            // app.getCurrency(app.user.countryCode);
            // app.getWeather(app.user.lat, app.user.lng, app.user);
            app.getDestinationInfo(location2);

        } else {
            alert("Something went wrong." + status);
        }
    });
}

app.getDestinationInfo = (location) => {
    const geocoder = new google.maps.Geocoder();
    geocoder.geocode({
        'address': location
    }, (results, status) => {
        if (status == google.maps.GeocoderStatus.OK) {
            const addressComponents = results[0].address_components.filter((component) => {
                return component.types[0] === 'country';
            });
            // console.log(addressComponents);
            app.destination.countryCode = addressComponents[0].short_name;
            app.destination.countryName = addressComponents[0].long_name;
            app.destination.lat = results[0].geometry.location.lat();
            app.destination.lng = results[0].geometry.location.lng();
            // console.log(app.user.countryCode);
            app.getWeather(app.destination.lat, app.destination.lng, app.destination);
            app.getCurrencies(app.user.countryCode, app.destination.countryCode);
            app.getCityCode(app.destination.lat, app.destination.lng);
            app.getLanguage(app.destination.countryCode);
            app.getRestaurants(app.destination.lat, app.destination.lng);
            app.getAirports(app.destination.lat, app.destination.lng);
        } else {
            alert("Something went wrong." + status);
        }
    });
}

app.getCoordinates = (location) => {
    const geocoder = new google.maps.Geocoder();
    geocoder.geocode({
        'address': location
    }, (res, err) => {
        if (err == google.maps.GeocoderStatus.OK) {
            let latitude = res[0].geometry.location.lat();
            let longitude = res[0].geometry.location.lng();
            console.log(latitude, longitude);
        } else {
            alert("Something went wrong." + err);
        }
    });
}

app.getWeather = (latitude, longitude, object) => {
    $.ajax({
        url: `https://api.darksky.net/forecast/ea2f7a7bab3daacc9f54f177819fa1d3/${latitude},${longitude}`,
        method: 'GET',
        dataType: 'jsonp',
        data: {
            'units': 'auto'
        }
    })
    .then((res) => {
        object.weatherConditions = res.daily.summary;
        object.currentTemp = Math.round(res.currently.temperature);
        object.currentIcon = res.currently.icon;
        // object.weatherIcon = res.daily.icon;
        // console.log(object.currentTemp);
        // console.log(object.weatherConditions);
        app.displayWeather(object);
        // console.log(res.currently.icon);
        
    });
}

app.getCityCode = (latitude, longitude) => {
    $.ajax({
        url: `https://api.sygictravelapi.com/1.0/en/places/detect-parents`,
        method: 'GET',
        dataType: 'json',
        headers: {
            'x-api-key': 'zziJYcjlmE8LbWHdvU5vC8UcSFvKEPsC3nkAl7eK'
        },
        data: {
            'location': `${latitude},${longitude}`
        }
    })
    .then((res) => {
        const data = res.data.places[0];
        app.destination.cityCode = data.id;
        app.getPOIs(app.destination.cityCode);
        app.getRestaurants(app.destination.cityCode);
    });
}

app.getPOIs = (cityCode) => {
    $.ajax({
        url: `https://api.sygictravelapi.com/1.0/en/places/list`,
        method: 'GET',
        dataType: 'json',
        headers: {
            'x-api-key': 'zziJYcjlmE8LbWHdvU5vC8UcSFvKEPsC3nkAl7eK'
        },
        data: {
            'parents': cityCode,
            'level': 'poi',
            'limit': 4,
        }
    }).then((res)=> {
        const points = res.data.places;
        // console.log(res.data.places);
        points.forEach((point)=> {
            const place = {
                'name': point.name,
                'description': point.perex,
                'photo': point.thumbnail_url,
            };
            app.POIs.push(place);
        });
        app.displayPOIs(app.POIs);

    });
}

app.getAirports = (lat, lng) => {
    $.ajax({
        url: `https://api.sygictravelapi.com/1.0/en/places/list`,
        method: 'GET',
        dataType: 'json',
        headers: {
            'x-api-key': 'zziJYcjlmE8LbWHdvU5vC8UcSFvKEPsC3nkAl7eK'
        },
        data: {
            'location': `${lat},${lng}`,
            'tags': 'Airport',
        }
    }) .then ((res) => {
        console.log(res);  
    })
}

app.getLanguage = (country) => {
    $.ajax({
        url: `https://restcountries.eu/rest/v2/name/${country}`,
        method: 'GET',
        dataType: 'json',
        data: {
            fullText: true
        }
    }) .then((res) => {
        console.log(res[0].languages[0].name);
        app.destination.languages = res[0].languages[0].name;
        console.log(res);
    })
}

app.offset = 4;

app.getRestaurants = (cityCode, offset = 0) => {
   return $.ajax({
        url: `https://api.sygictravelapi.com/1.0/en/places/list`,
        method: 'GET',
        dataType: 'json',
        headers: {
            'x-api-key': 'zziJYcjlmE8LbWHdvU5vC8UcSFvKEPsC3nkAl7eK'
        },
        data: {
            'categories': 'restaurants',
            'tags': 'restaurants',
            'categories_not': 'discovering|hiking|playing|relaxing|shopping|sightseeing|sleeping|doing_sports|traveling',
            'parents': cityCode,
            'limit': 100,
            'levels': 'poi'
        }
    }).then((res) => {
        const restaurantList = res.data.places;
        console.log(restaurantList);
        const filteredRestaurants = restaurantList.filter((place)=> {
            return place.thumbnail_url && place.perex
        });

        console.log(filteredRestaurants);
        const theFour= filteredRestaurants.slice(0,4);
        console.log(theFour);
       

        // if there are no restautanrs that have image and desc,
        // tell user 'sorry, we ont have a lot of info, but check out these restaurants:
        //
        theFour.forEach((restaurant) => {
            const item = {
                'name': restaurant.name,
                'description': restaurant.perex,
                'photo': restaurant.thumbnail_url
            }

            // This doesn't work, fix later
            if (restaurant.perex === null) {
                item.description = 'No description available.'
            } else if (restaurant.thumbnail_url === null) {
                item.photo = "No photo available."
            }
            app.restaurants.push(item);
        });
        console.log(app.restaurants);
        app.displayRestaurants(app.restaurants);
    });
}    

app.getCurrencies = (country1, country2) => {
     $.ajax({
        url: `https://restcountries.eu/rest/v2/name/${country1}`,
        method: 'GET',
        dataType: 'json',
        data: {
            fullText: true
        }
    }).then((res1) => {
        $.ajax({
            url: `https://restcountries.eu/rest/v2/name/${country2}`,
            method: 'GET',
            dataType: 'json',
            data: {
                fullText: true
            }
        }).then((res2)=> {

            // console.log(res1, res2)
            app.currency.userCurr = res1[0].currencies[0].code;
            app.currency.destCurr = res2[0].currencies[0].code;
            // return res1[0].currencies.code;
        // console.log(res.currencies);
        app.convertCurrency(app.currency.userCurr, app.currency.destCurr);
        })
   // console.log(res1);
    });    
}

app.convertCurrency = (userCurrency, destinationCurrency) => {
    $.ajax({
        url: `https://free.currencyconverterapi.com/api/v6/convert`,
        method: 'GET',
        dataType: 'json',
        data: {
            q: `${userCurrency}_${destinationCurrency},${destinationCurrency}_${userCurrency}`,
            compact: 'ultra'
        }
    }).then((res) => {
        // console.log(res);
        app.currency.exchangeRate = res[`${userCurrency}_${destinationCurrency}`];
        console.log(app.currency.exchangeRate);
        app.displayCurrency(app.currency);
    });
}

app.displayRestaurants = (array) => {
    const title = `<h1>Restaurants</h1>`;
    $('#restaurants').append(title);
    array.forEach((item) => {
        const name = `<h2>${item.name}<h2>`;
        const desc = `<p>${item.description}</p>`;
        const photo = `<img src="${item.photo}">`;
        $('#restaurants').append(name, photo, desc);
    });
}

app.displayCurrency = (object) => {
    const title = `<h1>Currency</h1>`;
    const html = `<h2>The exchange rate from ${object.userCurr} to ${object.destCurr} is ${object.exchangeRate}</h2>`;
    $('#currency').append(title,html);
}

app.displayPOIs = (array) => {
    const title = `<h1>Points of Interest</h1>`;
    $('#POI').append(title);
    array.forEach((item) => {
        const name = `<h2>${item.name}<h2>`;
        const desc = `<p>${item.description}</p>`;
        const photo = `<img src="${item.photo}">`;
        $('#POI').append(name, photo, desc);
    });
}

app.displayWeather = (object) => {
    const title = `<h1>Weather</h1>`;
    const html = `<h2>Current temp: ${object.currentTemp}</h2>
        <p>${object.weatherConditions}</p>`
    $('#weather').append(title, html);
}

app.events = () => {
    app.initAutocomplete('user');
    app.initAutocomplete('destination');
    $('form').on('submit', (e) => {
        e.preventDefault();
        $('div').empty();
        const user = $('#user').val();
        const destination = $('#destination').val();
        $('#test span').text(user);
        if (user.length > 0 && destination.length > 0) {
            app.getUserInfo(user, destination);
            setTimeout(()=> {
                console.log('userinfo', app.user);
                console.log('destinationinfo', app.destination);
                console.log('points of interest', app.POIs);
                console.log('exchange-rate', app.exchangeRate);
            }, 500);
        }
        $('#user').val('');
        $('#destination').val('');
        app.user = {};
        app.destination = {};
        app.currency= {};
        app.POIs = [];
        app.exchangeRate;
        app.restaurants = [];
    });
}

app.init = () => {
    app.events();
}

$(function () {
    console.log("ready!");
    app.init();
});