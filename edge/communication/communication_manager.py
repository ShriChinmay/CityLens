from edge.communication.mqtt_client import MQTTClient
from edge.storage.local_store import LocalStore


class CommunicationManager:
    def __init__(self):
        self.store = LocalStore()
        self.mqtt = MQTTClient()

    def connect(self):
        try:
            self.mqtt.connect()
            return True
        except Exception as e:
            print(f"MQTT connection failed: {e}")
            return False

    def send_event(self, event):
        # Always save the event locally first
        event_id = self.store.save_event(event)

        try:
            success = self.mqtt.publish_event(event)

            if success:
                self.store.mark_uploaded(event_id)
                return True

        except Exception as e:
            print(f"MQTT publish failed: {e}")

        return False

    # TODO: Add automatic retry scheduling/backoff for pending events.
    # TODO: Add connectivity handling so retries occur automatically
    # when the MQTT connection is restored.
    def retry_pending_events(self):
        pending = self.store.get_pending_events()

        for item in pending:
            try:
                success = self.mqtt.publish_event(item["event"])

                if success:
                    self.store.mark_uploaded(item["id"])

            except Exception as e:
                print(f"Retry failed: {e}")

    def close(self):
        self.mqtt.disconnect()
        self.store.close()