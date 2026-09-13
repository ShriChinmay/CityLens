require("dotenv").config({ path: "../.env" });

const mqtt = require("mqtt");

const { eventSchema } = require("../schemas/event.schema");
const eventService = require("../services/event.service");

const BROKER_URL =
    process.env.MQTT_BROKER_URL || "mqtt://localhost:1883";

const TOPIC =
    process.env.MQTT_TOPIC || "citylens/events";

const client = mqtt.connect(BROKER_URL);

client.on("connect", () => {
    console.log("Connected to MQTT broker.");

    client.subscribe(TOPIC, (error) => {
        if (error) {
            console.error("MQTT subscription failed:", error.message);
            return;
        }

        console.log(`Subscribed to MQTT topic: ${TOPIC}`);
    });
});

client.on("message", async (topic, message) => {
    try {
        const payload = JSON.parse(message.toString());

        console.log("\nMQTT event received:");
        console.log(payload);

        // Validate incoming event
        const validatedEvent = eventSchema.parse(payload);

        // Store event in PostgreSQL
        const storedEvent = await eventService.create(validatedEvent);

        console.log("Event stored in PostgreSQL:");
        console.log(storedEvent);
    } catch (error) {
        console.error("\nFailed to process MQTT event:");

        if (error.name === "ZodError") {
            console.error("Event validation failed:");
            console.error(error.issues);
        } else {
            console.error(error.message);
        }
    }
});

client.on("error", (error) => {
    console.error("MQTT error:", error.message);
});

client.on("close", () => {
    console.log("MQTT connection closed.");
});

module.exports = client;