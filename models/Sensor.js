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

/**
 * Represents a sensor resource. */
class Sensor {
    /**
     * @param {{
     *  id: string,
     *  clientId: string,
     *  createdAt: Date,
     *  name: string,
     *  type: string,
     *  mode: string,
     *  status: number,
     *  temperature: number?,
     *  battery: number?,
     *  rssi: number,
     *  snr: number,
     *  serverTime: Date,
     *  gatewayTime: Date,
     *  parkingLotId: string?,
     *  frameCount: number?,
     *  port: number,
     *  frequency: number?,
     *  dataRate: string?,
     *  errorRegister: number?,
     *  errorState: number?,
     * }} params : Contains initialization parameters.
     * */
    constructor(params) {
        /**
         * Sensor's unique id. Primary key. */
        this.id = params.id;

        /**
         * The unique id of the client that owns the sensor. Foreign key. */
        this.clientId = params.clientId;

        /**
         * The date this object was created at. */
        this.createdAt = params.createdAt;

        /**
         * Name of the sensor/parking spot. */
        this.name = params.name;

        /**
         * User set sensor type. */
        this.type = params.type;

        /**
         * Type of sensor, ie `Sensor.types.presence` or `Sensor.types.counter`.
         * */
        this.mode = params.mode;

        /**
         * Integer representation of the current state.
         * Use `this.mode` to interpret the value.
         * */
        this.status = params.status;

        /**
         * Sensor's last temperature reading. */
        this.temperature = params.temperature;

        /**
         * Sensor's last battery reading. */
        this.battery = params.battery;

        /**
         * Sensor's last RSSI reading. */
        this.rssi = params.rssi;

        /**
         * Sensor's last SNR reading. */
        this.snr = params.snr;

        /**
         * The last time the sensor communicated. */
        this.serverTime = params.serverTime;

        /**
         * Time from gateway. */
        this.gatewayTime = params.gatewayTime;

        /**
         * Id of the parking lot the sensor is in. This is null if it isn't in one. */
        this.parkingLotId = params.parkingLotId;

        /**
         * Last received frame count. */
        this.frameCount = params.frameCount;

        /**
         * Port that was last communicated on. */
        this.port = params.port;

        /**
         * Last reported frequency. */
        this.frequency = params.frequency;

        /**
         * Last reported data rate. */
        this.dataRate = params.dataRate;

        /**
         * Current error register status. */
        this.errorRegister = params.errorRegister;

        /**
         * Current error state status. */
        this.errorState = params.errorState;
    }

    /**
     * Returns the public instance of the sensor.
     * This should match the documented 'sensor' type in swagger. */
    publicInstance() {
        return {
            id: this.id,
            name: this.name,
            type: this.type,
            parkingLotId: this.parkingLotId,
            mode: this.mode,
            status: this.status,
            temperature: this.temperature,
            battery: this.battery,
            rssi: this.rssi,
            snr: this.snr,
            serverTime: this.serverTime,
            gatewayTime: this.gatewayTime,
        };
    }
}

/**
 * Available modes the sensor can be in. */
Sensor.modes = {
    /**
     * Classic 'CarPresence' sensor type. */
    presence: 'Presence',

    /**
     * Classic 'CarCounter' sensor type. */
    counter: 'Counter',
};

/**
 * The states the sensor can be in (presence mode). */
Sensor.states = {
    /**
     * Sensor does not detect a vehicle. */
    vacant: 'Vacant',

    /**
     * Sensor detects a vehicle. */
    occupied: 'Occupied',

    /**
     * Sensor has not communicated within the last 24 hours. */
    offline: 'Offline',
};

module.exports = Sensor;
