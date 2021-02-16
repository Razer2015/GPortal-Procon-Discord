const fetch = require('node-fetch');

const stateMessages = {
    error_restart: "Could not restart layer server",
    error_start: "Failed to start layer server",
    error_stop: "Layer server could not be stopped",
    layer_disabled: "Layer is disabled",
    layer_install: "Layer is installing",
    layer_maintenance: "Layer is in a maintenance mode",
    layer_notrespond: "Layer no longer responds",
    layer_off: "Layer is offline",
    layer_on: "Layer is running",
    layer_setup: "Layer is being set up",
    layer_started: "Layer is being started",
    layer_stopped: "Layer is being stopped",
    layer_unknown: "Unknown state",
    layer_update: "Layer is being updated",
    success_restart: "Layer server successfully restarted.",
    success_start: "Layer server started successfully.",
    success_stop: "Layer server successfully stopped.",
}

class Procon {
    constructor(layerId, authToken) {
        this.layerId = layerId;
        this.authToken = authToken;
        this.locale = process.env.LOCALE || 'en_GB';
    }

    async start() {
        try {
            const opts = {
                headers: {
                    cookie: `webinterface_session=${this.authToken}; webinterface_locale=${this.locale}`,
                    'Content-Type': 'application/x-www-form-urlencoded',
                    'X-Requested-With': 'XMLHttpRequest'
                }
            };

            const result = await fetch(`https://www.g-portal.com/eur/server/procon/start/${this.layerId}`, opts)
                .then(response => response.json());

            return result;
        } catch (error) {
            console.error(error);
        }
    }

    async stop() {
        try {
            const opts = {
                headers: {
                    cookie: `webinterface_session=${this.authToken}; webinterface_locale=${this.locale}`,
                    'Content-Type': 'application/x-www-form-urlencoded',
                    'X-Requested-With': 'XMLHttpRequest'
                }
            };

            const result = await fetch(`https://www.g-portal.com/eur/server/procon/stop/${this.layerId}`, opts)
                .then(response => response.json());

                return result;
        } catch (error) {
            console.error(error);
        }
    }

    async restart() {
        try {
            const opts = {
                headers: {
                    cookie: `webinterface_session=${this.authToken}; webinterface_locale=${this.locale}`,
                    'Content-Type': 'application/x-www-form-urlencoded',
                    'X-Requested-With': 'XMLHttpRequest'
                }
            };

            const result = await fetch(`https://www.g-portal.com/eur/server/procon/restart/${this.layerId}`, opts)
                .then(response => response.json());

                return result;
        } catch (error) {
            console.error(error);
        }
    }

    async updateStatus() {
        try {
            const opts = {
                headers: {
                    cookie: `webinterface_session=${this.authToken}; webinterface_locale=${this.locale}`,
                    'Content-Type': 'application/x-www-form-urlencoded',
                    'X-Requested-With': 'XMLHttpRequest'
                }
            };

            const result = await fetch(`https://www.g-portal.com/eur/server/procon/getServerStateFromDaemon/${this.layerId}`, opts)
                .then(response => response.json());

            let response = this.resolveStatus(result.state);
            response.state = result.state;
            return response;
        } catch (error) {
            console.error(error);
        }
    }

    resolveStatus(status) {
        switch (status) {
            case 0:
                return { message: stateMessages['layer_setup'], color: '#f70c0c' };
            case 1:
                return { message: stateMessages['layer_install'], color: '#f70c0c' };
            case 2:
                return { message: stateMessages['layer_disabled'], color: '#f70c0c' };
            case 3:
                return { message: stateMessages['layer_off'], color: '#f70c0c' };
            case 4:
                return { message: stateMessages['layer_stopped'], color: '#f70c0c' };
            case 5:
                return { message: stateMessages['layer_started'], color: '#f7f70c' };
            case 6:
                return { message: stateMessages['layer_on'], color: '#5af70c' };
            case 7:
                return { message: stateMessages['layer_update'], color: '#f70c0c' };
            case 99:
                return { message: stateMessages['layer_maintenance'], color: '#f70c0c' };
            case 8:
                return { message: stateMessages['stateDead'], color: '#f70c0c' };
            case 100:
                return { message: stateMessages['layer_unknown'], color: '#f70c0c' };
        }
    }
}

module.exports = Procon
