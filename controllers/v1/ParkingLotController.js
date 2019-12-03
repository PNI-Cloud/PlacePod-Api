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
const { ApiError, Response } = require('../../models');
const { LaneDb, ParkingLotDb, SensorDb } = require('../../database');
/** @typedef {import('../../models/Caller')} Caller */

/** Body schema for creating a parking lot. */
const createBody = Joi.object()
    .keys({
        name: Joi.string().required(),
        totalSpaces: Joi.number().integer().positive(),
        count: Joi.number().integer(),
    });

/** Params schema for a string id. */
const idParam = Joi.object()
    .keys({
        id: Joi.string().required(),
    });

/** Body schema for updating a parking lot. */
const updateBody = Joi.object()
    .min(1)
    .keys({
        name: Joi.string(),
        totalSpaces: Joi.number().integer().positive(),
        count: Joi.number().integer(),
    });

/**
 * Expose endpoints for managing the 'parking lot' resource.
 * Minimal Scopes: [user] */
class ParkingLotController {
    /**
     * Returns all parking lots belonging to the user.
     * @param {Caller} caller : Info relating to the user making the request.
     * @public */
    async getAll(caller) {
        const lots = await ParkingLotDb.find(caller);
        return lots.map((lot) => lot.publicInstance());
    }

    /**
     * Creates a new parking lot.
     * @param {Caller} caller : Info relating to the user making the request.
     * @param {{}} body : Contains fields for the new parking lot.
     * @public */
    async create(caller, body) {
        /**
         * @type {{
         *  name: string,
         *  totalSpaces: number,
         *  count: number,
         * }}
         */
        let newLot;

        try {
            newLot = await createBody.validateAsync(body, { stripUnknown: true });
        } catch (ex) {
            throw new ApiError(`Invalid input: ${ex.message}.`, 400);
        }

        const id = await ParkingLotDb.create(caller, newLot);
        return { id };
    }

    /**
     * Returns the parking lot that matches the given id.
     * @param {Caller} caller : Info relating to the user making the request.
     * @param {{}} params : Contains the id of the parking lot to get.
     * @public */
    async get(caller, params) {
        /** @type {String} */
        let id;

        try {
            ({ id } = await idParam.validateAsync(params, { stripUnknown: true }));
        } catch (ex) {
            throw new ApiError(`Invalid input: ${ex.message}.`, 400);
        }

        const lot = await ParkingLotDb.findOne(caller, id);
        if (!lot) {
            throw new ApiError(`Parking lot with id '${id}' doesn't exist.`, 404);
        }

        return lot.publicInstance();
    }

    /**
     * Update the parking lot that matches the given id.
     * @param {Caller} caller : Info relating to the user making the request.
     * @param {{}} params : Contains the id of the parking lot to update.
     * @param {{}} body : Contains fields to be updated.
     * @public */
    async update(caller, params, body) {
        /** @type {String} */
        let id;

        /**
         * @type {{
         *  name: string,
         *  totalSpaces: number,
         *  count: number,
         * }}
         */
        let updates;

        try {
            [{ id }, updates] = await Promise.all([
                idParam.validateAsync(params, { stripUnknown: true }),
                updateBody.validateAsync(body, { stripUnknown: true }),
            ]);
        } catch (ex) {
            throw new ApiError(`Invalid input: ${ex.message}.`, 400);
        }

        if (!(await ParkingLotDb.exists(caller, id))) {
            throw new ApiError(`Parking lot with id '${id}' doesn't exist.`, 404);
        }

        await ParkingLotDb.update(caller, id, updates);
        return new Response(`Parking lot with id '${id}' successfully updated.`);
    }

    /**
     * Delete the parking lot that matches the given id.
     * @param {Caller} caller : Info relating to the user making the request.
     * @param {{}} params : Contains the id of the parking lot to delete.
     * @public */
    async delete(caller, params) {
        /** @type {String} */
        let id;

        try {
            ({ id } = await idParam.validateAsync(params, { stripUnknown: true }));
        } catch (ex) {
            throw new ApiError(`Invalid input: ${ex.message}.`, 400);
        }

        if (!(await ParkingLotDb.exists(caller, id))) {
            throw new ApiError(`Parking lot with id '${id}' doesn't exist.`, 404);
        }
        // Error if it doesn't exist or if there are sensors/lanes attached to it.
        const sensors = await SensorDb.find(caller, { parkingLotId: id });
        if (sensors.length) {
            throw new ApiError(`Parking lot with id '${id}' contains ${sensors.length} sensor(s)`, 400);
        }
        const lanes = await LaneDb.find(caller, { parkingLotId: id });
        if (lanes.length) {
            throw new ApiError(`Parking lot with id '${id}' contains ${lanes.length} lane(s)`, 400);
        }

        await ParkingLotDb.delete(caller, id);
        return new Response(`Parking lot with id '${id}' successfully deleted.`);
    }
}

module.exports = new ParkingLotController();
