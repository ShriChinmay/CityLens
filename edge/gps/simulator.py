class GPSSimulator:
    def __init__(self, start_lat, start_lon, end_lat, end_lon, duration):
        self.start_lat = start_lat
        self.start_lon = start_lon
        self.end_lat = end_lat
        self.end_lon = end_lon
        self.duration = duration

    def get_location(self, elapsed_time):
        if elapsed_time < 0:
            elapsed_time = 0

        if elapsed_time > self.duration:
            elapsed_time = self.duration

        progress = elapsed_time / self.duration

        latitude = (
            self.start_lat
            + progress * (self.end_lat - self.start_lat)
        )

        longitude = (
            self.start_lon
            + progress * (self.end_lon - self.start_lon)
        )

        return latitude, longitude