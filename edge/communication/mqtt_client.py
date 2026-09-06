import json
import paho.mqtt.client as mqtt


class MQTTClient:
    def __init__(self, broker="localhost", port=1883, topic="citylens/events"):
        self.broker = broker
        self.port = port
        self.topic = topic

        self.client = mqtt.Client(
            mqtt.CallbackAPIVersion.VERSION2
        )

    def connect(self):
        self.client.connect(self.broker, self.port)
        print("Connected to MQTT broker.")

    def publish_event(self, event):
        payload = json.dumps(event)

        result = self.client.publish(
            self.topic,
            payload
        )

        if result.rc == mqtt.MQTT_ERR_SUCCESS:
            print("Event published successfully.")
            return True

        print("Failed to publish event.")
        return False

    def disconnect(self):
        self.client.disconnect()
        print("Disconnected from MQTT broker.")