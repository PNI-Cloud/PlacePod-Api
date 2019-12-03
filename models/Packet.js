//
// Copyright (C) 2019 Protonex LLC dba PNI Sensor
//
//     This program is free software: you can redistribute it and/or modify
//     it under the terms of the GNU General Public License as published by
//     the Free Software Foundation, either version 3 of the License, or
//     (at your option) any later version.
//
//     This program is distributed in the hope that it will be useful,
//     but WITHOUT ANY WARRANTY; without even the implied warranty of
//     MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
//     GNU General Public License for more details.
//
//     You should have received a copy of the GNU General Public License
//     along with this program.  If not, see <https://www.gnu.org/licenses/>.
//

'use strict';

/* Imports */
const Sensor = require('./Sensor');

/** Represents a decoded PlacePod uplink packet. */
class Packet {
    constructor() {
        /**
         * The status value of the PlacePod. Defaults to `-1` (not set).
         * @type {number} */
        this.status = -1;

        /**
         * What type of PlacePod is this? Either `Presence` or `Counter`.
         * Defaults to empty string `''`.
         * @type {string} */
        this.mode = '';

        /**
         * Was the message a keep alive? Defaults to `false`.
         * @type {boolean} */
        this.keepAlive = false;

        /**
         * The battery reading. Defaults to `null`.
         * @type {number?} */
        this.battery = null;

        /**
         * The temperature reading. Defaults to `null`.
         * @type {number?} */
        this.temperature = null;

        /** Possible error states. */
        this.error = {
            /**
             * Error register. Defaults to `null`.
             * @type {number?} */
            register: null,

            /**
             * Error debug state. Defaults to `null`.
             * @type {number?} */
            state: null,
        };
    }

    /**
     * Set the appropriate members based on the provided key.
     * Return true if successful, return false if the key had already been set!
     * @param {string} key : Key mapping to the member variable to set.
     * @param {number} value : The value to set the member variable to.
     * @public */
    trySet(key, value) {
        switch (key) {
            case 'presence_21':
                if (this.status !== -1) {
                    return false;
                }
                this.mode = Sensor.modes.presence;
                this.status = value;
                break;

            case 'presence_55':
                if (this.status !== -1) {
                    return false;
                }
                this.mode = Sensor.modes.presence;
                this.status = value;
                this.keepAlive = true;
                break;

            case 'digital_input_33':
                if (this.status !== -1) {
                    return false;
                }
                this.mode = Sensor.modes.counter;
                this.status = value;
                break;

            case 'digital_input_55':
                if (this.status !== -1) {
                    return false;
                }
                this.mode = Sensor.modes.counter;
                this.status = value;
                this.keepAlive = true;
                break;

            case 'analog_input_3':
                this.battery = value;
                break;

            case 'temperature_2':
                this.temperature = value;
                break;

            case 'digital_input_5':
                this.error.register = value;
                break;

            case 'digital_input_6':
                this.error.state = value;
                break;

            default:
                // Unhandled pair.
                break;
        }

        return true;
    }
}

module.exports = Packet;
