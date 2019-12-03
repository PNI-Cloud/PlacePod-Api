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
const SensorDb = require('./SensorDb');
const { SensorLog } = require('../../models');
/** @typedef {import('../../models/Caller')} Caller */
/** @typedef {import('../../models/SensorState')} SensorState */

/**
 * MongoDb implementation of Sensor Log related database operations. */
class SensorLogDb {
    /**
     * Get all sensor logs for the user that fit within the filters.
     * Do NOT return existing logs for sensors that have been removed.
     * Do NOT return logs with a status of -1, they are non-critical uplinks.
     * @param {Caller} caller : Info relating to the user making the request.
     * @param {object} options : Query options including:
     *  @param {Date} options.startTime : Starting date-time to get logs.
     *  @param {Date} options.endTime : Ending date-time to get logs.
     *  @param {number} options.limit : Maximum number of logs to return.
     * @param {object} filters : Filtering options. If none are included then get all
     * logs for existing sensors. Options include:
     *  @param {string} filters.sensorId : Filter by specific sensor.
     *  @param {string} filters.parkingLotId : Filter by sensors within the given lot.
     *  @param {string} filters.laneId : Filter by sensors within the given lane.
     * @public */
    async find(caller, options, filters = { }) {
        const filterQuery = {
            clientId: caller.clientId,
            sensorId: { $in: [] },
            serverTime: {
                $gte: new Date(options.startTime).toISOString(),
                $lte: new Date(options.endTime).toISOString(),
            },
        };

        if (filters.sensorId) {
            filterQuery.sensorId.$in.push(filters.sensorId);
        }

        if (filters.parkingLotId) {
            const lotSensors = await SensorDb.find(caller, { parkingLotId: filters.parkingLotId });
            if (!lotSensors || !lotSensors.length) {
                return [];
            }
            filterQuery.sensorId.$in.push(...lotSensors.map((sensor) => sensor.id));
        }

        if (filters.laneId) {
            const lane = await LaneDb.findOne(caller, filters.laneId);
            if (!lane) {
                return [];
            }
            filterQuery.sensorId.$in.push(lane.frontId, lane.backId);
        }

        if (!filterQuery.sensorId.$in.length) {
            const sensors = await SensorDb.find(caller);
            filterQuery.sensorId.$in.push(...sensors.map((sensor) => sensor.id));
        }

        try {
            const sensorLogs = await new Promise((resolve, reject) => {
                let cursor = MongoDb.sensorLogs
                    .find(filterQuery)
                    .sort({ createdAt: -1 });

                if (options.limit) {
                    cursor = cursor.limit(options.limit);
                }
                cursor.toArray((err, res) => {
                    if (err) {
                        reject(err);
                    } else {
                        resolve(res);
                    }
                });
            });
            return this.sensorLogFactory(sensorLogs);
        } catch (ex) {
            console.error('SensorLogDb.find() mongodb error: ', ex);
            throw new Error('Something went wrong. Try again.');
        }
    }

    /**
     * Attempt to create and insert a new sensor log record.
     * @param {Caller} caller : Info relating to the user making the request.
     * @param {SensorState} sensorState : Object containing the new sensor log's data.
     * @returns {Promise<string?>}
     * @public */
    async create(caller, sensorState) {
        const sensorLog = {
            sensorId: sensorState.sensorId.toLowerCase(),
            clientId: caller.clientId,
            serverTime: sensorState.serverTime,
            gatewayTime: sensorState.gatewayTime,
            rawPayload: sensorState.rawPayload.toUpperCase(),
            frameCount: sensorState.frameCount,
            rssi: sensorState.rssi,
            snr: sensorState.snr,
            gatewayId: sensorState.gatewayId,
            frequency: sensorState.frequency,
            dataRate: sensorState.dataRate,
            port: sensorState.port,
            status: sensorState.status,
            mode: sensorState.mode,
            keepAlive: sensorState.keepAlive,
            battery: sensorState.battery,
            temperature: sensorState.temperature,
            errorRegister: sensorState.errorRegister,
            errorState: sensorState.errorState,
        };

        try {
            const id = await new Promise((resolve, reject) => {
                MongoDb.sensorLogs.insertOne(sensorLog, (err, res) => {
                    if (err) {
                        reject(err);
                    } else {
                        resolve(res.insertedId);
                    }
                });
            });
            return id;
        } catch (ex) {
            console.error('SensorLogDb.create() mongodb error: ', ex);
            throw new Error('Something went wrong. Try again.');
        }
    }

    /**
     * Convert the raw mongodb objects into sensor log objects.
     * @param {object[]} logs : Array of raw sensor log objects from mongodb.
     * @private */
    sensorLogFactory(logs) {
        if (!logs || !logs.length) {
            return [];
        }

        return logs.map((log) => new SensorLog({
            sensorId: log.sensorId,
            clientId: log.clientId,

            mode: log.mode,
            status: log.status,
            keepAlive: log.keepAlive,
            temperature: log.temperature,
            battery: log.battery,

            frameCount: log.frameCount,
            rssi: log.rssi,
            snr: log.snr,
            serverTime: log.serverTime,
            gatewayTime: log.gatewayTime,

            rawPayload: log.rawPayload,
            errorRegister: log.errorRegister,
            errorState: log.errorState,
            gatewayId: log.gatewayId,
            frequency: log.frequency,
            dataRate: log.dataRate,
            port: log.port,
        }));
    }
}

module.exports = new SensorLogDb();
