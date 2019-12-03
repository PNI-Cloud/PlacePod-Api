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

/** @typedef {import('./Packet')} Packet */

class SensorState {
    /**
     * @param {string} id : Id of the sensor.
     * @param {{
     *  payload: string,
     *  frameCount: number,
     *  rssi: number,
     *  snr: number,
     *  gatewayId: string,
     *  frequency: number,
     *  dataRate: string,
     *  port: number,
     *  gatewayTime: string,
     * }} uplink : Uplink information.
     * @param {Packet} packet : Decoded data. */
    constructor(id, uplink, packet) {
        this.sensorId = id;
        this.serverTime = new Date().toISOString();
        this.gatewayTime = uplink.gatewayTime || this.serverTime;

        this.rawPayload = uplink.payload;

        /* LoRa Wan */
        this.frameCount = uplink.frameCount;
        this.rssi = uplink.rssi;
        this.snr = uplink.snr;
        this.gatewayId = uplink.gatewayId;
        this.frequency = uplink.frequency;
        this.dataRate = uplink.dataRate;
        this.port = uplink.port;

        /* Packet */
        this.status = packet.status;
        this.mode = packet.mode;
        this.keepAlive = packet.keepAlive;
        this.battery = packet.battery;
        this.temperature = packet.temperature;
        this.errorRegister = packet.error.register;
        this.errorState = packet.error.state;
    }
}

module.exports = SensorState;
