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
const Joi = require('@hapi/joi');
const { ApiError } = require('../../models');
const {
    LaneDb,
    ParkingLotDb,
    SensorDb,
    SensorLogDb,
} = require('../../database');
/** @typedef {import('../../models/Caller')} Caller */

/** Query schema for searching for sensor logs to get. */
const searchQuery = Joi.object()
    .keys({
        startTime: Joi.date().iso(),
        endTime: Joi.date().iso(),
        limit: Joi.number().positive(),
    });

/** Params schema for a sensorId. */
const sensorIdParam = Joi.object()
    .keys({
        id: Joi.string().hex().length(16).required(),
    });

/** Params schema for a string id. */
const idParam = Joi.object()
    .keys({
        id: Joi.string().required(),
    });

/**
 * Format base options.
 * @param {{
 *  startTime: string|Date,
 *  endTime: string|Date,
 *  limit: number,
 * }} options
 */
function checkOptions(options) {
    let { startTime, endTime, limit } = options;

    // Set fields to defaults if not provided.
    const now = new Date();
    if (!endTime) {
        endTime = now;
    }
    if (!startTime) {
        startTime = new Date(new Date(endTime).setHours(endTime.getHours() - 4));
    }
    if (startTime.getTime() >= endTime.getTime()) {
        throw new ApiError('\'startTime\' must occur before \'endTime\'.', 400);
    }
    if (!limit) {
        limit = 100;
    }
    return { startTime, endTime, limit };
}

/**
 * Expose endpoints for managing the 'sensor log' resource.
 * Minimal Scopes: [user] */
class SensorLogController {
    /**
     * Get all sensor logs that fit within the requested options.
     * @param {Caller} caller : Info relating to the user making the request.
     * @param {{}} query : Contains optional search filters.
     * @public */
    async getAll(caller, query) {
        /**
         * @type {{
         *  startTime: string|Date,
         *  endTime: string|Date,
         *  limit: number,
         * }}
         */
        let options;

        try {
            options = await searchQuery.validateAsync(query, { stripUnknown: true });
        } catch (ex) {
            throw new ApiError(`Invalid input: ${ex.message}.`, 400);
        }

        const sensorLogs = await SensorLogDb.find(caller, checkOptions(options));
        return sensorLogs.map((sensorLog) => sensorLog.publicInstance());
    }

    /**
     * Get logs for the sensor with the matching id that fit within the requested options.
     * @param {Caller} caller : Info relating to the user making the request.
     * @param {{}} params : Contains the id of the sensor to get logs for.
     * @param {{}} query : Contains optional search filters.
     * @public */
    async getBySensor(caller, params, query) {
        /** @type {string} */
        let id;

        /**
         * @type {{
         *  startTime: string|Date,
         *  endTime: string|Date,
         *  limit: number,
         * }}
         */
        let options;

        try {
            [{ id }, options] = await Promise.all([
                sensorIdParam.validateAsync(params, { stripUnknown: true }),
                searchQuery.validateAsync(query, { stripUnknown: true }),
            ]);
        } catch (ex) {
            throw new ApiError(`Invalid input: ${ex.message}.`, 400);
        }

        if (!(await SensorDb.exists(caller, id))) {
            throw new ApiError(`Sensor with id '${id}' doesn't exist.`, 404);
        }

        const sensorLogs = await SensorLogDb.find(caller, checkOptions(options), { sensorId: id });
        return sensorLogs.map((sensorLog) => sensorLog.publicInstance());
    }

    /**
     * Get logs for the sensors in the parking lot with the matching id that fit
     * within the requested options.
     * @param {Caller} caller : Info relating to the user making the request.
     * @param {{}} params : Contains the id of the lot to get logs for.
     * @param {{}} query : Contains optional search filters.
     * @public */
    async getByLot(caller, params, query) {
        /** @type {string} */
        let id;

        /**
         * @type {{
         *  startTime: string|Date,
         *  endTime: string|Date,
         *  limit: number,
         * }}
         */
        let options;

        try {
            [{ id }, options] = await Promise.all([
                idParam.validateAsync(params, { stripUnknown: true }),
                searchQuery.validateAsync(query, { stripUnknown: true }),
            ]);
        } catch (ex) {
            throw new ApiError(`Invalid input: ${ex.message}.`, 400);
        }

        if (!(await ParkingLotDb.exists(caller, id))) {
            throw new ApiError(`Parking lot with id '${id}' doesn't exist.`, 404);
        }

        const sensorLogs = await SensorLogDb.find(caller, checkOptions(options), {
            parkingLotId: id,
        });
        return sensorLogs.map((sensorLog) => sensorLog.publicInstance());
    }

    /**
     * Get logs for the sensors in the lane with the matching id that fit
     * within the requested options.
     * @param {Caller} caller : Info relating to the user making the request.
     * @param {{}} params : Contains the id of the lane to get logs for.
     * @param {{}} query : Contains optional search filters.
     * @public */
    async getByLane(caller, params, query) {
        /** @type {string} */
        let id;

        /**
         * @type {{
         *  startTime: string|Date,
         *  endTime: string|Date,
         *  limit: number,
         * }}
         */
        let options;

        try {
            [{ id }, options] = await Promise.all([
                idParam.validateAsync(params, { stripUnknown: true }),
                searchQuery.validateAsync(query, { stripUnknown: true }),
            ]);
        } catch (ex) {
            throw new ApiError(`Invalid input: ${ex.message}.`, 400);
        }

        if (!(await LaneDb.exists(caller, id))) {
            throw new ApiError(`Lane with id '${id}' doesn't exist.`, 404);
        }

        const sensorLogs = await SensorLogDb.find(caller, checkOptions(options), { laneId: id });
        return sensorLogs.map((sensorLog) => sensorLog.publicInstance());
    }
}

module.exports = new SensorLogController();
