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
const LaneDb = require('./LaneDb');
const MongoDb = require('./MongoDb');
const { Sensor, Packet } = require('../../models');
/** @typedef {import('../../models/Caller')} Caller */
/** @typedef {import('../../models/SensorState')} SensorState */

/**
 * MongoDb implementation of Sensor related database operations. */
class SensorDb {
    /**
     * Check to see if the sensor exists for the given user.
     * @param {Caller} caller : Info relating to the user making the request.
     * @param {string} id : Unique id of the sensor to check.
     * @public */
    async exists(caller, id) {
        return !!(await this.findOne(caller, id));
    }

    /**
     * Returns all sensors for the given user.
     * @param {Caller} caller : Info relating to the user making the request.
     * @param {object} filters : Optional query filters.
     *  @param {string} filters.state : Either all vacant, occupied, or offline sensors.
     *  @param {string} filters.type : All sensors of the specified type.
     *  @param {string} filters.parkingLotId : All sensors who are assigned to the lot.
     *  @param {string} filters.laneId : All sensors who are assigned to the lane.
     * @param {number?} limit : Maximum number of sensors to return.
     * @public */
    async find(caller, filters = { }, limit = null) {
        const filterQuery = { clientId: caller.clientId };
        if (filters.state) {
            switch (filters.state) {
                case Sensor.states.vacant:
                    filterQuery.mode = Sensor.modes.presence;
                    filterQuery.status = 0;
                    break;

                case Sensor.states.occupied:
                    filterQuery.mode = Sensor.modes.presence;
                    filterQuery.status = 1;
                    break;

                case Sensor.states.offline: {
                    const now = new Date();
                    const yesterday = new Date(now.setDate(now.getDate() - 1)).toISOString();
                    filterQuery.serverTime = { $gt: yesterday };
                    break;
                }

                default:
                    console.error(`Unhandled sensor 'state' filter given: '${filters.state}'.`);
                    break;
            }
        }
        if (filters.type) {
            filterQuery.type = filters.type;
        }
        if (filters.parkingLotId) {
            filterQuery.parkingLotId = filters.parkingLotId;
        }

        if (filters.laneId) {
            const lane = await LaneDb.findOne(caller, filters.laneId);
            if (!lane) {
                return [];
            }
            filterQuery.id = {
                $in: [lane.frontId, lane.backId],
            };
        }

        try {
            const sensors = await new Promise((resolve, reject) => {
                let cursor = MongoDb.sensors
                    .find(filterQuery)
                    .sort({ createdAt: -1 });

                if (limit) {
                    cursor = cursor.limit(limit);
                }
                cursor.toArray((err, res) => {
                    if (err) {
                        reject(err);
                    } else {
                        resolve(res);
                    }
                });
            });
            return this.sensorFactory(sensors);
        } catch (ex) {
            console.error('SensorDb.find() mongodb error: ', ex);
            throw new Error('Something went wrong. Try again.');
        }
    }

    /**
     * Returns the sensor that matches the given id.
     * @param {Caller} caller : Info relating to the user making the request.
     * @param {string} id : Unique id of the sensor to get.
     * @public */
    async findOne(caller, id) {
        const filter = { clientId: caller.clientId, id: id.toLowerCase() };
        try {
            const sensor = await new Promise((resolve, reject) => {
                MongoDb.sensors.findOne(filter, (err, res) => {
                    if (err) {
                        reject(err);
                    } else {
                        resolve(res);
                    }
                });
            });
            if (!sensor) {
                return null;
            }
            return this.sensorFactory([sensor])[0];
        } catch (ex) {
            console.error('SensorDb.findOne() mongodb error: ', ex);
            throw new Error('Something went wrong. Try again.');
        }
    }

    /**
     * Attempt to create a new sensor using the given parameters.
     * @param {Caller} caller : Info relating to the user making the request.
     * @param {object} newSensor : Parameters for creating a new sensor.
     *  @param {string} newSensor.id
     *  @param {string} newSensor.name
     *  @param {string} newSensor.type
     *  @param {string} newSensor.parkingLotId
     * @returns {Promise<string>}
     * @public */
    async create(caller, newSensor) {
        const sensor = {
            id: newSensor.id.toLowerCase(),
            name: newSensor.name,
            type: newSensor.type,
            parkingLotId: newSensor.parkingLotId || null,
            clientId: caller.clientId,
            createdAt: new Date().toISOString(),
        };

        try {
            await new Promise((resolve, reject) => {
                MongoDb.sensors.insertOne(sensor, (err, res) => {
                    if (err) {
                        reject(err);
                    } else {
                        resolve(res.insertedId);
                    }
                });
            });
            return sensor.id;
        } catch (ex) {
            console.error('SensorDb.create() mongodb error: ', ex);
            throw new Error('Something went wrong. Try again.');
        }
    }

    /**
     * Update the sensor that matches the given id.
     * @param {Caller} caller : Info relating to the user making the request.
     * @param {string} id : Unique id of the sensor to update.
     * @param {object} sensorUpdates : Updates to be applied.
     *  @param {string} sensorUpdates.name
     *  @param {string} sensorUpdates.type
     *  @param {string} sensorUpdates.parkingLotId
     * @public */
    async update(caller, id, sensorUpdates) {
        const updates = { };
        if (typeof sensorUpdates.name === 'string') {
            updates.name = sensorUpdates.name;
        }
        if (typeof sensorUpdates.type === 'string') {
            updates.type = sensorUpdates.type;
        }
        if (typeof sensorUpdates.parkingLotId === 'string') {
            updates.parkingLotId = sensorUpdates.parkingLotId;
        }

        if (!Object.keys(updates).length) {
            return;
        }
        const filter = { clientId: caller.clientId, id: id.toLowerCase() };

        try {
            await new Promise((resolve, reject) => {
                MongoDb.sensors.updateOne(filter, { $set: updates }, (err) => {
                    if (err) {
                        reject(err);
                    } else {
                        resolve();
                    }
                });
            });
        } catch (ex) {
            console.error('SensorDb.update() mongodb error: ', ex);
            throw new Error('Something went wrong. Try again.');
        }
    }

    /**
     * Update the sensor's internal state based off of the decoded information.
     * @param {Caller} caller : Info relating to the user making the request.
     * @param {SensorState} sensorState : Object containing the sensor's updated state.
     * @public */
    async updateState(caller, sensorState) {
        // Have a default packet.
        const packet = new Packet();

        const updates = {
            serverTime: sensorState.serverTime,
            gatewayTime: sensorState.gatewayTime,
            errorRegister: sensorState.errorRegister,
            errorState: sensorState.errorState,
        };
        if (typeof sensorState.frameCount === 'number') {
            updates.frameCount = sensorState.frameCount;
        }
        if (typeof sensorState.rssi === 'number') {
            updates.rssi = sensorState.rssi;
        }
        if (typeof sensorState.snr === 'number') {
            updates.snr = sensorState.snr;
        }
        if (typeof sensorState.frequency === 'number') {
            updates.frequency = sensorState.frequency;
        }
        if (typeof sensorState.dataRate === 'string') {
            updates.dataRate = sensorState.dataRate;
        }
        if (typeof sensorState.port === 'number') {
            updates.port = sensorState.port;
        }
        if (
            typeof sensorState.status === 'number'
            && sensorState.status !== packet.status
        ) {
            updates.status = sensorState.status;
        }
        if (
            typeof sensorState.mode === 'string'
            && sensorState.mode !== packet.mode
        ) {
            updates.mode = sensorState.mode;
        }
        if (typeof sensorState.battery === 'number') {
            updates.battery = sensorState.battery;
        }
        if (typeof sensorState.temperature === 'number') {
            updates.temperature = sensorState.temperature;
        }

        const filter = { clientId: caller.clientId, id: sensorState.sensorId.toLowerCase() };

        try {
            await new Promise((resolve, reject) => {
                MongoDb.sensors.updateOne(filter, { $set: updates }, (err) => {
                    if (err) {
                        reject(err);
                    } else {
                        resolve();
                    }
                });
            });
        } catch (ex) {
            console.error('SensorDb.update() mongodb error: ', ex);
            throw new Error('Something went wrong. Try again.');
        }
    }

    /**
     * Deletes the sensor that matches the given id. This SHOULDNT remove history logs.
     * @param {Caller} caller : Info relating to the user making the request.
     * @param {string} id : Unique id of the sensor to delete.
     * @public */
    async delete(caller, id) {
        const filter = { clientId: caller.clientId, id: id.toLowerCase() };
        try {
            await new Promise((resolve, reject) => {
                MongoDb.sensors.deleteOne(filter, (err) => {
                    if (err) {
                        reject(err);
                    } else {
                        resolve();
                    }
                });
            });
        } catch (ex) {
            console.error('SensorDb.delete() mongodb error: ', ex);
            throw new Error('Something went wrong. Try again.');
        }
    }

    /**
     * Convert the raw mongodb objects into sensor objects.
     * @param {object[]} sensors : Array of raw sensor objects from mongodb.
     * @private */
    sensorFactory(sensors) {
        if (!sensors || !sensors.length) {
            return [];
        }

        return sensors.map((sensor) => new Sensor({
            id: sensor.id,
            clientId: sensor.clientId,
            createdAt: new Date(sensor.createdAt),
            name: sensor.name,
            type: sensor.type,
            parkingLotId: sensor.parkingLotId,
            mode: sensor.mode,
            status: sensor.status,
            temperature: sensor.temperature,
            battery: sensor.battery,
            rssi: sensor.rssi,
            snr: sensor.snr,
            frameCount: sensor.frameCount,
            port: sensor.port,
            serverTime: new Date(sensor.serverTime),
            gatewayTime: new Date(sensor.gatewayTime),
            frequency: sensor.frequency,
            dataRate: sensor.data_rate,
            errorRegister: sensor.errorRegister,
            errorState: sensor.errorState,
        }));
    }
}

module.exports = new SensorDb();
