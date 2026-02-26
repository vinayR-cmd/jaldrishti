// Initialize the map and set its view (London coordinates)
const mapCenter = [51.505, -0.09];
const map = L.map('map').setView(mapCenter, 13);

// Add a free public OpenStreetMap tile layer
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
}).addTo(map);

// 5 fake hotspot markers
const hotspots = [
    { loc: [51.505, -0.09], title: "Central Point", desc: "This is the center of the map." },
    { loc: [51.515, -0.10], title: "West Cafe", desc: "A cozy place for excellent coffee." },
    { loc: [51.495, -0.08], title: "South Park", desc: "Beautiful greenery perfect for a morning walk." },
    { loc: [51.520, -0.07], title: "North Museum", desc: "Exhibits of incredible local history." },
    { loc: [51.490, -0.11], title: "Tech Hub", desc: "Where all the innovative coding happens." }
];

hotspots.forEach(spot => {
    // Add marker to map
    const marker = L.marker(spot.loc).addTo(map);

    // Bind popup with title and short description
    marker.bindPopup(`<b>${spot.title}</b><br>${spot.desc}`);

    // Enable hover interaction (open popup on hover)
    marker.on('mouseover', function (e) {
        this.openPopup();
    });

    // Close popup when hover out
    marker.on('mouseout', function (e) {
        this.closePopup();
    });
});
