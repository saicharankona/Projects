document.addEventListener('DOMContentLoaded', () => {
    // --- DOM Elements ---
    // Ensure these IDs match your index.html
    const citySelect = document.getElementById('citySelect');
    const getWeatherBtn = document.getElementById('getWeatherBtn');
    const weatherResultDiv = document.getElementById('weatherResult');
    const errorMessageDiv = document.getElementById('errorMessage');
    const cityNameH2 = document.getElementById('cityName');
    const weatherIconImg = document.getElementById('weatherIcon');
    const temperatureP = document.getElementById('temperature');
    const weatherDescriptionP = document.getElementById('weatherDescription');
    const humiditySpan = document.getElementById('humidity');
    const windSpeedSpan = document.getElementById('windSpeed');

    // --- API Configuration ---
    // IMPORTANT: Replace with your actual WeatherAPI.com API key
    const API_KEY = '4bbb64758aab4477ae0145808252006'; 
    const API_BASE_URL = 'https://api.weatherapi.com/v1/current.json';

    // --- Load City Data from File ---
    async function loadCitiesAndPopulateDropdown() {
        const cityDataFilePath = 'city_coordinates.csv'; // Path to your JSON file
        try {
            const response = await fetch(cityDataFilePath);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const csvText = await response.text();
            const lines = csvText.trim().split('\n');
            const header = lines[0].split(',').map(h => h.trim()); // "latitude","longitude","city","country"
            const citiesFromFile = lines.slice(1).map(line => {
                const values = line.split(',').map(v => v.trim());
                const cityObject = {};
                header.forEach((key, index) => {
                    cityObject[key] = values[index];
                });
                // Transform to the expected format
                return {
                    name: `${cityObject.city}, ${cityObject.country}`,
                    // Using city name as value, ensure it's URL-friendly if used directly in API
                    value: cityObject.city.toLowerCase().replace(/\s+/g, '-'), 
                    coordinates: {
                        lat: parseFloat(cityObject.latitude),
                        lon: parseFloat(cityObject.longitude)
                    }
                };
            });

            // Add a default "Select a City" option at the beginning
            const citiesData = [
                { name: "Select a City", value: "", coordinates: null },
                ...citiesFromFile // Spread the cities from the file
            ];

            populateCityDropdown(citiesData); // Pass the loaded data to populate function

        } catch (error) {
            console.error("Could not load city data:", error);
            displayError(`Failed to load city list: ${error.message}`);
            // Optionally disable the button or dropdown if cities can't be loaded
            if (getWeatherBtn) getWeatherBtn.disabled = true;
            if (citySelect) citySelect.disabled = true;
        }
    }

    // --- Populate City Dropdown ---
    function populateCityDropdown(citiesToPopulate) {
        if (!citySelect) {
            console.error("City select dropdown not found!");
            return;
        }
        citiesToPopulate.forEach(city => {
            const option = document.createElement('option');
            // Use city name as value for direct query, or store coords for more precise query
            // Ensure the value is suitable for your API call (city name or lat/lon string)
            option.value = city.value; 
            option.textContent = city.name;
            if (city.coordinates) { // Store coordinates as a data attribute if needed later
                option.dataset.lat = city.coordinates.lat;
                option.dataset.lon = city.coordinates.lon;
            }
            citySelect.appendChild(option);
        });
    }

    // --- Fetch Weather Data ---
    async function fetchWeatherData(cityIdentifier) {
        if (API_KEY === 'YOUR_WEATHERAPI_COM_API_KEY' || !API_KEY) {
            displayError("Please set your WeatherAPI.com API key in js/main.js");
            return;
        }

        let queryValue;
        if (typeof cityIdentifier === 'object' && cityIdentifier.lat && cityIdentifier.lon) {
            // If cityIdentifier is an object with lat/lon (preferred for accuracy)
            queryValue = `${cityIdentifier.lat},${cityIdentifier.lon}`;
        } else if (typeof cityIdentifier === 'string' && cityIdentifier.trim() !== '') {
            // If cityIdentifier is a city name string
            queryValue = encodeURIComponent(cityIdentifier);
        } else {
            displayError("Invalid city identifier provided.");
            return;
        }

        // Construct URL for WeatherAPI.com
        const queryParams = `key=${API_KEY}&q=${queryValue}&aqi=no`; // aqi=no to exclude air quality data

        const url = `${API_BASE_URL}?${queryParams}`;

        try {
            const response = await fetch(url);
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
            }
            const data = await response.json();
            displayWeatherData(data);
        } catch (error) {
            console.error("Error fetching weather data:", error);
            displayError(`Failed to fetch weather: ${error.message}`);
        }
    }

    // --- Display Weather Data ---
    function displayWeatherData(data) {
        // Adjust for WeatherAPI.com response structure
        if (!data || !data.location || !data.current || !data.current.condition) {
            displayError("Received incomplete weather data from API.");
            return;
        }

        cityNameH2.textContent = data.location.name ? `${data.location.name}, ${data.location.country}` : 'Weather Details';
        temperatureP.textContent = `${Math.round(data.current.temp_c)}°C`; // temp_c for Celsius
        weatherDescriptionP.textContent = data.current.condition.text;
        humiditySpan.textContent = `${data.current.humidity}%`;
        windSpeedSpan.textContent = `${data.current.wind_kph} kph`; // wind_kph for kilometers per hour

        // Set weather icon
        // WeatherAPI.com icon URLs might start with //, so prepend https:
        let iconUrl = data.current.condition.icon;
        if (iconUrl.startsWith("//")) {
            iconUrl = "https:" + iconUrl;
        }
        weatherIconImg.src = iconUrl;
        weatherIconImg.alt = data.current.condition.text;

        weatherResultDiv.style.display = 'block';
        errorMessageDiv.style.display = 'none';
    }

    // --- Display Error Message ---
    function displayError(message) {
        errorMessageDiv.textContent = message;
        errorMessageDiv.style.display = 'block';
        weatherResultDiv.style.display = 'none';
    }

    // --- Event Listeners ---
    if (getWeatherBtn) {
        getWeatherBtn.addEventListener('click', () => {
            const selectedCityValue = citySelect.value;
            const selectedOption = citySelect.options[citySelect.selectedIndex];

            // Clear previous results/errors
            errorMessageDiv.style.display = 'none';
            weatherResultDiv.style.display = 'none';

            if (!selectedCityValue) {
                displayError("Please select a city.");
                return;
            }

            // Option 1: Use city name (value of the option)
            // fetchWeatherData(selectedCityValue);

            // Option 2: Use coordinates if available (more precise)
            const lat = selectedOption.dataset.lat;
            const lon = selectedOption.dataset.lon;

            if (lat && lon) {
                fetchWeatherData({ lat, lon });
            } else if (selectedCityValue) { // Fallback to city name if no coords
                fetchWeatherData(selectedCityValue);
            } else {
                displayError("City data is incomplete. Cannot fetch weather.");
            }
        });
    }

    // --- Initialize ---
    loadCitiesAndPopulateDropdown(); // Call this to load CSV and then populate
});