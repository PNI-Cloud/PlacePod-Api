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
 * Represents a sensor log resource. */
class SensorLog {
    /**
     * @param {{
     *  sensorId: string,
     *  clientId: string,
     *  mode: string,
     *  status: number,
     *  keepAlive: boolean,
     *  temperature: number,
     *  battery: number,
     *  frameCount: number,
     *  rssi: number,
     *  snr: number,
     *  serverTime: Date,
     *  gatewayTime: Date,
     *  rawPayload: string,
     *  errorRegister: number,
     *  errorState: number,
     *  gatewayId: string,
     *  frequency: number,
     *  dataRate: string,
     *  port: number,
     * }} params : Contains initialization parameters.
     * */
    constructor(params) {
        /**
         * Unique id of the sensor this log is for. */
        this.sensorId = params.sensorId;
        /**
         * The unique id of the client that owns the sensor the log is for. Foreign key. */
        this.clientId = params.clientId;

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
         * Is the log a keep alive message? */
        this.keepAlive = params.keepAlive;

        /**
         * Sensor's temperature reading. This is likely null. */
        this.temperature = params.temperature;

        /**
         * Sensor's battery reading. This is likely null. */
        this.battery = params.battery;

        /**
         * Sensor's LoRa network frame count. */
        this.frameCount = params.frameCount;

        /**
         * Sensor's RSSI reading. */
        this.rssi = params.rssi;

        /**
         * Sensor's SNR reading. */
        this.snr = params.snr;

        /**
         * The time the sensor communicated. */
        this.serverTime = params.serverTime;

        /**
         * Time from gateway. */
        this.gatewayTime = params.gatewayTime;

        /**
         * Raw sensor payload that generatd this log. */
        this.rawPayload = params.rawPayload;

        /**
         * Current error register status. */
        this.errorRegister = params.errorRegister;

        /**
         * Current error state status. */
        this.errorState = params.errorState;

        /**
         * Id of the gateway which sent the uplink. */
        this.gatewayId = params.gatewayId;

        /**
         * The sent frequency. */
        this.frequency = params.frequency;

        /**
         * The sent data rate. */
        this.dataRate = params.dataRate;

        /**
         * The sent port. */
        this.port = params.port;
    }

    /**
     * Returns the public instance of the sensor log.
     * This should match the documented 'sensorlog' type in swagger. */
    publicInstance() {
        return {
            sensorId: this.sensorId,
            mode: this.mode,
            status: this.status,
            keepAlive: this.keepAlive,
            temperature: this.temperature,
            battery: this.battery,
            frameCount: this.frameCount,
            rssi: this.rssi,
            snr: this.snr,
            serverTime: this.serverTime,
            gatewayTime: this.gatewayTime,
        };
    }
}

module.exports = SensorLog;
