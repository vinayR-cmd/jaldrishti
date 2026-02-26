import fs from 'fs';

const cities = [
    ["Delhi", 28.6139, 77.2090],
    ["Mumbai", 19.0760, 72.8777],
    ["Kolkata", 22.5726, 88.3639],
    ["Chennai", 13.0827, 80.2707],
    ["Bengaluru", 12.9716, 77.5946],
    ["Hyderabad", 17.3850, 78.4867],
    ["Jaipur", 26.9124, 75.7873],
    ["Lucknow", 26.8467, 80.9462],
    ["Ahmedabad", 23.0225, 72.5714],
    ["Pune", 18.5204, 73.8567],
    ["Bhopal", 23.2599, 77.4126],
    ["Patna", 25.5941, 85.1376],
    ["Chandigarh", 30.7333, 76.7794],
    ["Guwahati", 26.1445, 91.7362],
    ["Thiruvananthapuram", 8.5241, 76.9366],
    ["Ranchi", 23.3441, 85.3096],
    ["Bhubaneswar", 20.2961, 85.8245],
    ["Shimla", 31.1048, 77.1734],
    ["Srinagar", 34.0837, 74.7973],
    ["Indore", 22.7196, 75.8577]
];

const data = [];
const startTime = new Date(2026, 0, 1, 8, 0, 0);

for (let i = 0; i < 1000; i++) {
    const cityData = cities[Math.floor(Math.random() * cities.length)];
    const tds = Math.floor(Math.random() * (900 - 150 + 1)) + 150;
    const turbidity = Number((Math.random() * (10.0 - 0.5) + 0.5).toFixed(2));
    const temperature = Math.floor(Math.random() * (38 - 15 + 1)) + 15;

    const lat = Number((cityData[1] + (Math.random() * 0.5 - 0.25)).toFixed(6));
    const lng = Number((cityData[2] + (Math.random() * 0.5 - 0.25)).toFixed(6));

    const timestamp = new Date(startTime.getTime() + i * 10 * 60000).toISOString();

    data.push({
        id: i + 1,
        location: cityData[0],
        tds,
        turbidity,
        temperature,
        lat,
        lng,
        timestamp
    });
}

fs.writeFileSync('src/data.json', JSON.stringify(data, null, 2));
console.log("data.json successfully updated");
