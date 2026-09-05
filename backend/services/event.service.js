async function create(event) {


    return {
        message: "Event received successfully",
        event
    };
}

module.exports = {
    create
};