export interface SensorData {
  id: number;
  tds_value: number;
  location_lat: number;
  location_lng: number;
  timestamp: string;
}

export interface CommunityReport {
  id: number;
  issue_type: string;
  description: string;
  location_lat: number;
  location_lng: number;
  timestamp: string;
}
