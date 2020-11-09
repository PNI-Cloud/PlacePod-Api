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
const { decoder } = require('cayenne-lpp');
const { ApiError, Sensor, SensorState } = require('../models');
const {
    LaneDb,
    ParkingLotDb,
    SensorDb,
    SensorLogDb,
} = require('../database');
const PacketFactory = require('./PacketFactory');
const VehicleCounting = require('./pni-vehicle-counting');
/** @typedef {import('../models/Caller')} Caller */

const vehicleCounting = new VehicleCounting();

/**
* Handle a new vehicle counting event.
* @param {Caller} caller : Info relating to the user making the request.
* @param {SensorState} sensorState : The state the sensor is currently in.
* @public */
async function handleCountingEvent(caller, sensorState) {
    const lanes = await LaneDb.find(caller, { sensorId: sensorState.sensorId });
    if (!lanes.length) {
        return;
    }

    lanes.forEach((lane) => {
        const laneInfo = {
            id: `${caller.clientId}: ${lane.id}`,
            timeout: lane.timeout,
            count: lane.count,
            frontId: lane.frontId,
            backId: lane.backId,
            state: lane.state,
        };

        const eventReceived = {
            sensorId: sensorState.sensorId,
            count: sensorState.status,
            time: sensorState.gatewayTime,
            frameCount: sensorState.frameCount,
        };

        vehicleCounting.handleEvent(laneInfo, eventReceived, async (err, res) => {
            if (err) {
                return;
            }
            const promises = [];

            if (res.updates) {
                promises.push(LaneDb.update(caller, lane.id, {
                    count: res.updates.count,
                    state: res.updates.state,
                }));
                if (res.updates.change > 0) {
                    // Add if a the lane goes into the lot, subtract if it goes out.
                    const scale = (lane.direction) ? 1 : -1;
                    promises.push(ParkingLotDb.update(caller, lane.parkingLotId, {
                        change: res.updates.change * scale,
                    }));
                }
            }
            await Promise.all(promises);
        });
    });
}

/**
 * Service for handling PlacePod uplink messages.
 */
class UplinkService {
    /**
     * Process the uplink. Then save the log and update the sensor.
     * @param {Caller} caller : Info relating to the user making the request.
     * @param {string} id : Id of the sensor the uplink is for.
     * @param {{
     *  payload: string,
     *  port: number,
     *  frameCount: number,
     *  rssi: number,
     *  snr: number,
     *  gatewayId: string,
     *  gatewayTime: string,
     *  frequency: number,
     *  dataRate: string,
     * }} uplinkPacket : Uplink info.
     */
    async process(caller, id, uplinkPacket) {
        if (!(await SensorDb.exists(caller, id))) {
            console.log('Sensor doesn\'t exist, creating...');
            const newSensor = {
                id,
                name: `${uplinkPacket.network}_autocreate`,
                type: 'autocreate',
            };
            await SensorDb.create(caller, newSensor);
        }

        const buffer = Buffer.from(uplinkPacket.payload, 'hex');
        let results;
        try {
            results = decoder.decode(buffer);
        } catch (ex) {
            throw new ApiError(`Invalid payload: '${uplinkPacket.payload}'.`, 400);
        }

        const packets = PacketFactory.create(results);
        for (const packet of packets) {
            const sensorState = new SensorState(id, uplinkPacket, packet);

            // eslint-disable-next-line no-await-in-loop
            await Promise.all([
                SensorDb.updateState(caller, sensorState),
                SensorLogDb.create(caller, sensorState),
            ]);

            if (sensorState.mode === Sensor.modes.counter && !sensorState.keepAlive) {
                // eslint-disable-next-line no-await-in-loop
                await handleCountingEvent(caller, sensorState);
            }
        }

        return (packets && packets.length);
    }
}

module.exports = new UplinkService();
