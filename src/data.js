// Generate thousands of points across India to form large realistic patches
const generateIndiaData = () => {
    const data = [];

    // Helper to generate a massive regional patch
    // higher variance = more sporadic, lower variance = solid color
    const generateCluster = (centerLat, centerLng, radius, numPoints, baseTds, tdsVariance, name) => {
        for (let i = 0; i < numPoints; i++) {
            // Skewed random to keep points somewhat denser towards the center
            const r = radius * Math.sqrt(Math.random());
            const theta = Math.random() * 2 * Math.PI;

            // Adjust for longitude squishing slightly 
            const latOffset = r * Math.cos(theta);
            const lngOffset = (r * 1.2) * Math.sin(theta);

            const tds = baseTds + (Math.random() * tdsVariance - tdsVariance / 2);

            data.push({
                id: data.length + 1,
                location: `${name} ${i}`,
                lat: centerLat + latOffset,
                lng: centerLng + lngOffset,
                tds: Math.max(0, Math.min(600, tds))
            });
        }
    }

    // --- REALISTIC / THEORETICAL MACRO ZONES IN INDIA ---

    // 1. SPECIFIC REQUEST: Seelampur / North-East Delhi (Highly Unsafe / RED)
    // Decreased density and added slight spread so it looks like a realistic hotspot
    generateCluster(28.67, 77.27, 0.15, 300, 500, 150, "Seelampur Zone");

    // 2. NCR General (Risk/Unsafe - Yellow/Red mix)
    generateCluster(28.6, 77.2, 0.8, 400, 300, 150, "NCR Region");

    // 3. Punjab/Haryana Agrarian Belt
    generateCluster(30.4, 75.8, 3.0, 500, 250, 150, "Punjab Agrarian");

    // 4. Gangetic Plains / UP / Bihar
    generateCluster(26.5, 80.5, 4.0, 600, 350, 200, "Gangetic Plains");
    generateCluster(25.6, 85.1, 3.0, 400, 350, 200, "Bihar Belt");

    // 5. West Bengal / Ganges Delta
    generateCluster(23.5, 88.5, 2.5, 400, 400, 150, "Bengal Delta");

    // 6. Western India / Gujarat / Rajasthan
    generateCluster(24.5, 72.5, 4.0, 400, 300, 150, "Rajasthan Arid");
    generateCluster(22.5, 71.5, 3.0, 300, 250, 150, "Gujarat Salt");

    // 7. Central India / MP / Chhattisgarh
    generateCluster(23.0, 78.5, 4.5, 400, 200, 150, "Central India");

    // 8. Deccan Plateau
    generateCluster(19.0, 76.0, 4.5, 500, 250, 150, "Deccan Plateau");

    // 9. Southern India
    generateCluster(10.5, 76.5, 2.5, 300, 100, 100, "Kerala/Ghats");
    generateCluster(13.5, 75.5, 3.0, 300, 120, 100, "Karnataka Coastal");

    // 10. East Coast / Chennai / Andhra
    generateCluster(13.0, 80.0, 2.0, 300, 300, 150, "Chennai Coast");

    // 11. Himalayan Region
    generateCluster(32.0, 77.0, 2.5, 200, 80, 50, "Himachal/Uttarakhand");

    // 12. General Countrywide noise (to blend edges softly)
    for (let i = 0; i < 800; i++) {
        const lat = 8.0 + Math.random() * (35.0 - 8.0); // India Lat range
        const lng = 68.0 + Math.random() * (97.0 - 68.0); // India Lng range

        // Add a slight bias to keep them closer to landmass center
        data.push({
            id: data.length + 1,
            location: `India Background ${i}`,
            lat: lat,
            lng: lng,
            tds: Math.random() * 250 // Mostly moderate baseline
        });
    }

    return data;
};

export const waterData = generateIndiaData();