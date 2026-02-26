#include <ESP8266WiFi.h>
#include <ESP8266HTTPClient.h>
#include <WiFiClient.h>

// --- WiFi Credentials ---
const char* ssid = "realme 5 pro";
const char* password = "12345678";

// --- Server Address ---
// REPLACE WITH THE IP ADDRESS OF THE COMPUTER RUNNING THE NODE.JS SERVER
// If your computer's IP is 192.168.1.100, the URL should be "http://192.168.1.100:3001/api/tds"
const char* serverName = "http://10.126.130.9:3001/api/tds";

// --- TDS Sensor Configuration ---
#define TdsSensorPin A0
#define VREF 3.3
#define SCOUNT 30
float temperature = 25;

void setup() {
  Serial.begin(115200);
  
  // Connect to Wi-Fi
  WiFi.begin(ssid, password);
  Serial.println("Connecting to WiFi...");
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  Serial.println("\nConnected to WiFi network with IP Address: ");
  Serial.println(WiFi.localIP());
}

void loop() {
  int analogValue = analogRead(TdsSensorPin);
  float voltage = analogValue * VREF / 1024.0;
  float compensationCoefficient = 1.0 + 0.02 * (temperature - 25.0);
  float compensationVoltage = voltage / compensationCoefficient;
  
  float tdsValue = (133.42 * compensationVoltage * compensationVoltage * compensationVoltage 
                   - 255.86 * compensationVoltage * compensationVoltage 
                   + 857.39 * compensationVoltage) * 0.5;
  
  Serial.print("TDS Value: ");
  Serial.print(tdsValue);
  Serial.println(" ppm");

  // Send data to server
  if(WiFi.status() == WL_CONNECTED){
    WiFiClient client;
    HTTPClient http;
    
    // Your Domain name with URL path or IP address with path
    http.begin(client, serverName);
    
    // Specify content-type header
    http.addHeader("Content-Type", "application/json");
    
    // Convert float to integer to prevent UI overflow with decimals
    int cleanTdsValue = (int)tdsValue;

    // Prepare JSON payload
    String httpRequestData = "{\"tds\":\"" + String(cleanTdsValue) + "\"}";
    
    // Send HTTP POST request
    int httpResponseCode = http.POST(httpRequestData);
     
    Serial.print("HTTP Response code: ");
    Serial.println(httpResponseCode);
      
    // Free resources
    http.end();
  }
  else {
    Serial.println("WiFi Disconnected");
  }

  // Wait 1 second before next reading
  delay(1000);
}
