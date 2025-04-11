// Missoula Interactive Map - 90s Style!
document.addEventListener('DOMContentLoaded', function() {
    // API endpoints - use the deployed server URL
    const API_URL = 'https://3000-ihcqd4jkg4srxd5thpdtx-8bb4aa19.manus.computer/api';
    
    // Missoula, MT coordinates
    const missoula = [46.8721, -113.9940];
    
    // Initialize the map centered on Missoula
    const map = L.map('map').setView(missoula, 13);
    
    // Add a retro-styled tile layer (OpenStreetMap with custom styling)
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        maxZoom: 18,
        // Apply a CSS filter to give the map a retro look
        className: 'retro-map-tiles'
    }).addTo(map);
    
    // Create a custom pin icon class to extend the default Leaflet icon
    const CustomPinIcon = L.Icon.extend({
        options: {
            iconUrl: 'skull.png',
            iconSize: [32, 32],
            iconAnchor: [16, 32],
            popupAnchor: [0, -32],
            className: 'custom-pin-icon'
        }
    });

    // Create instances of the custom pin icon
    const defaultPinIcon = new CustomPinIcon();
    const newPinIcon = new CustomPinIcon({className: 'custom-pin-icon new-pin'});
    
    // Add a marker for downtown Missoula
    const downtownMarker = L.marker([46.8721, -113.9940], {icon: defaultPinIcon}).addTo(map);
    downtownMarker.bindPopup("<b>Downtown Missoula</b><br>The heart of the city!").openPopup();
    
    // Load pins from the server
    function loadPins() {
        fetch(`${API_URL}/pins`)
            .then(response => {
                if (!response.ok) {
                    throw new Error('Network response was not ok');
                }
                return response.json();
            })
            .then(pins => {
                // Clear existing pins list
                const pinsList = document.getElementById('pins-list');
                pinsList.innerHTML = '';
                
                // Add each pin to the map and list
                pins.forEach(pin => {
                    const marker = L.marker(pin.location, {icon: defaultPinIcon}).addTo(map);
                    marker.bindPopup(`<b>${pin.name}</b><br>${pin.description}`);
                    
                    // Add to the pins list
                    addPinToList(pin.name, pin.description, marker);
                });
            })
            .catch(error => {
                console.error('Error loading pins:', error);
                // If server is not available, use default pins
                loadDefaultPins();
            });
    }
    
    // Fallback to load default pins if server is not available
    function loadDefaultPins() {
        const defaultPins = [
            {
                name: "Caras Park",
                location: [46.8701, -113.9957],
                description: "Not an intersection, but funky lot layout."
            }
        ];
        
        defaultPins.forEach(pin => {
            const marker = L.marker(pin.location, {icon: defaultPinIcon}).addTo(map);
            marker.bindPopup(`<b>${pin.name}</b><br>${pin.description}`);
            
            // Add to the pins list
            addPinToList(pin.name, pin.description, marker);
        });
    }
    
    // Load pins when the page loads
    loadPins();
    
    // Variables to track the current pin being added
    let tempMarker = null;
    let newPinLocation = null;
    
    // Handle map clicks for adding new pins
    map.on('click', function(e) {
        // Store the clicked location
        newPinLocation = e.latlng;
        
        // Remove any existing temporary marker
        if (tempMarker) {
            map.removeLayer(tempMarker);
        }
        
        // Add a temporary marker
        tempMarker = L.marker(newPinLocation, {icon: newPinIcon}).addTo(map);
        tempMarker.bindPopup("<b>New Pin</b><br>Fill out the form to save this pin!").openPopup();
        
        // Show the pin form
        document.getElementById('pin-form').style.display = 'block';
    });
    
    // Handle save pin button click
    document.getElementById('save-pin').addEventListener('click', function() {
        const pinName = document.getElementById('pin-name').value;
        const pinDescription = document.getElementById('pin-description').value;
        
        if (pinName && newPinLocation) {
            // Save the pin to the server
            const pinData = {
                name: pinName,
                location: [newPinLocation.lat, newPinLocation.lng],
                description: pinDescription || ''
            };
            
            fetch(`${API_URL}/pins`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(pinData),
            })
            .then(response => {
                if (!response.ok) {
                    throw new Error('Network response was not ok');
                }
                return response.json();
            })
            .then(savedPin => {
                // Remove the temporary marker
                if (tempMarker) {
                    map.removeLayer(tempMarker);
                }
                
                // Add a permanent marker
                const marker = L.marker(newPinLocation, {icon: defaultPinIcon}).addTo(map);
                marker.bindPopup(`<b>${pinName}</b><br>${pinDescription}`);
                
                // Add to the pins list
                addPinToList(pinName, pinDescription, marker);
                
                // Reset the form
                document.getElementById('pin-name').value = '';
                document.getElementById('pin-description').value = '';
                document.getElementById('pin-form').style.display = 'none';
                
                // Reset variables
                tempMarker = null;
                newPinLocation = null;
                
                // Play a 90s-style sound effect
                playSound('save');
                
                // Show a 90s-style alert
                showRetroAlert('Pin saved successfully!');
            })
            .catch(error => {
                console.error('Error saving pin:', error);
                
                // Even if server save fails, show the pin locally
                // Remove the temporary marker
                if (tempMarker) {
                    map.removeLayer(tempMarker);
                }
                
                // Add a permanent marker
                const marker = L.marker(newPinLocation, {icon: defaultPinIcon}).addTo(map);
                marker.bindPopup(`<b>${pinName}</b><br>${pinDescription}`);
                
                // Add to the pins list
                addPinToList(pinName, pinDescription, marker);
                
                // Reset the form
                document.getElementById('pin-name').value = '';
                document.getElementById('pin-description').value = '';
                document.getElementById('pin-form').style.display = 'none';
                
                // Reset variables
                tempMarker = null;
                newPinLocation = null;
                
                // Play a 90s-style sound effect
                playSound('save');
                
                // Show a 90s-style alert
                showRetroAlert('Pin saved locally (server unavailable)!');
            });
        } else {
            // Play error sound
            playSound('error');
            
            // Show a 90s-style alert for error
            showRetroAlert('Please enter a name for your pin!');
        }
    });
    
    // Handle cancel button click
    document.getElementById('cancel-pin').addEventListener('click', function() {
        // Remove the temporary marker
        if (tempMarker) {
            map.removeLayer(tempMarker);
        }
        
        // Reset the form
        document.getElementById('pin-name').value = '';
        document.getElementById('pin-description').value = '';
        document.getElementById('pin-form').style.display = 'none';
        
        // Reset variables
        tempMarker = null;
        newPinLocation = null;
        
        // Play a 90s-style sound effect
        playSound('cancel');
    });
    
    // Function to add a pin to the list in the sidebar
    function addPinToList(name, description, marker) {
        const pinsList = document.getElementById('pins-list');
        const pinItem = document.createElement('div');
        pinItem.className = 'pin-item';
        pinItem.innerHTML = `<strong>${name}</strong><br>${description || 'No description'}`;
        
        // Add click event to focus on the pin when clicked in the list
        pinItem.addEventListener('click', function() {
            map.setView(marker.getLatLng(), 15);
            marker.openPopup();
            playSound('click');
        });
        
        pinsList.appendChild(pinItem);
    }
    
    // Function to play 90s-style sound effects
    function playSound(type) {
        // In a real implementation, we would play actual sounds
        console.log(`Playing ${type} sound effect`);
    }
    
    // Function to show a 90s-style alert
    function showRetroAlert(message) {
        alert(message);
    }
    
    // Simulate visitor counter increment
    let counter = 1;
    const counterElement = document.querySelector('.counter-number');
    setInterval(function() {
        counter++;
        counterElement.textContent = counter.toString().padStart(5, '0');
    }, 10000); // Increment every 10 seconds for demo purposes
    
    // Add a custom control for the "Best viewed in Netscape" message
    const netscapeControl = L.Control.extend({
        options: {
            position: 'bottomleft'
        },
        onAdd: function() {
            const container = L.DomUtil.create('div', 'leaflet-bar leaflet-control netscape-notice');
            container.innerHTML = 'Best viewed in<br>Netscape Navigator';
            return container;
        }
    });
    
    map.addControl(new netscapeControl());
});
