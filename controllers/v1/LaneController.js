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
const Joi = require('joi');
const { ApiError, Response } = require('../../models');
const { LaneDb, ParkingLotDb, SensorDb } = require('../../database');
/** @typedef {import('../../models/Caller')} Caller */

/** Body schema for creating a lane. */
const createBody = Joi.object()
    .keys({
        name: Joi.string().required(),
        frontId: Joi.string().hex().length(16).required(),
        backId: Joi.string().hex().length(16).required(),
        parkingLotId: Joi.string().required(),
        direction: Joi.bool().required(),
        count: Joi.number().integer().positive().allow(0),
    });

/** Params schema for a string id. */
const idParam = Joi.object()
    .keys({
        id: Joi.string().required(),
    });

/** Body schema for updating a lane. */
const updateBody = Joi.object()
    .min(1)
    .keys({
        name: Joi.string(),
        frontId: Joi.string().hex().length(16),
        backId: Joi.string().hex().length(16),
        parkingLotId: Joi.string(),
        direction: Joi.bool(),
        count: Joi.number().integer().positive().allow(0),
    });

/**
 * Expose endpoints for managing the 'lane' resource.
 * Minimal Scopes: [user] */
class LaneController {
    /**
     * Returns all lanes belonging to the user.
     * @param {Caller} caller : Info relating to the user making the request.
     * @public */
    async getAll(caller) {
        const lanes = await LaneDb.find(caller);
        return lanes.map((lane) => lane.publicInstance());
    }

    /**
     * Creates a new lane.
     * @param {Caller} caller : Info relating to the user making the request.
     * @param {{}} body : Contains fields for the new lane.
     * @public */
    async create(caller, body) {
        /**
         * @type {{
         *  name: string,
         *  frontId: string,
         *  backId: string,
         *  parkingLotId: string,
         *  direction: boolean,
         *  count: number,
         * }}
         */
        let newLane;

        try {
            newLane = await createBody.validateAsync(body, { stripUnknown: true });
        } catch (ex) {
            throw new ApiError(`Invalid input: ${ex.message}.`, 400);
        }

        if (newLane.frontId === newLane.backId) {
            throw new ApiError('\'frontId\' and \'backId\' must be different.', 400);
        }
        if (!(await SensorDb.exists(caller, newLane.frontId))) {
            throw new ApiError(`Sensor with id '${newLane.frontId}' doesn't exist.`, 404);
        }
        if (!(await SensorDb.exists(caller, newLane.backId))) {
            throw new ApiError(`Sensor with id '${newLane.backId}' doesn't exist.`, 404);
        }
        if (!(await ParkingLotDb.exists(caller, newLane.parkingLotId))) {
            throw new ApiError(`Parking lot with id '${newLane.parkingLotId}' doesn't exist.`, 404);
        }

        const id = await LaneDb.create(caller, newLane);
        return { id };
    }

    /**
     * Returns the lane that matches the given id.
     * @param {Caller} caller : Info relating to the user making the request.
     * @param {{}} params : Contains the id of the lane to get.
     * @public */
    async get(caller, params) {
        /** @type {string} */
        let id;

        try {
            ({ id } = await idParam.validateAsync(params, { stripUnknown: true }));
        } catch (ex) {
            throw new ApiError(`Invalid input: ${ex.message}.`, 400);
        }

        const lane = await LaneDb.findOne(caller, id);
        if (!lane) {
            throw new ApiError(`Lane with id '${id}' doesn't exist.`, 404);
        }

        return lane.publicInstance();
    }

    /**
     * Update the lane that matches the given id.
     * @param {Caller} caller : Info relating to the user making the request.
     * @param {{}} params : Contains the id of the lane to update.
     * @param {{}} body : Contains fields to be updated.
     * @public */
    async update(caller, params, body) {
        /** @type {string} */
        let id;

        /**
         * @type {{
         *  name: string,
         *  frontId: string,
         *  backId: string,
         *  parkingLotId: string,
         *  direction: boolean,
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

        const lane = await LaneDb.findOne(caller, id);
        if (!lane) {
            throw new ApiError(`Lane with id '${id}' doesn't exist.`, 404);
        }

        let { frontId, backId } = lane;

        if (
            updates.parkingLotId
            && updates.parkingLotId !== lane.parkingLotId
            && !(await ParkingLotDb.exists(caller, updates.parkingLotId))
        ) {
            throw new ApiError(`Parking lot with id '${updates.parkingLotId}' doesn't exist.`, 404);
        }

        if (updates.frontId && updates.frontId !== lane.frontId) {
            if (!(await SensorDb.exists(caller, updates.frontId))) {
                throw new ApiError(`Sensor with id '${updates.frontId}' doesn't exist.`, 404);
            }
            ({ frontId } = updates);
        }

        if (updates.backId && updates.backId !== lane.backId) {
            if (!(await SensorDb.exists(caller, updates.backId))) {
                throw new ApiError(`Sensor with id '${updates.backId}' doesn't exist.`, 404);
            }
            ({ backId } = updates);
        }

        if (frontId === backId) {
            throw new ApiError('\'frontId\' and \'backId\' must be different.', 400);
        }

        await LaneDb.update(caller, id, updates);
        return new Response(`Lane with id '${id}' successfully updated.`);
    }

    /**
     * Delete the lane that matches the given id.
     * @param {Caller} caller : Info relating to the user making the request.
     * @param {{}} params : Contains the id of the lane to delete.
     * @public */
    async delete(caller, params) {
        /** @type {string} */
        let id;

        try {
            ({ id } = await idParam.validateAsync(params, { stripUnknown: true }));
        } catch (ex) {
            throw new ApiError(`Invalid input: ${ex.message}.`, 400);
        }

        if (!(await LaneDb.exists(caller, id))) {
            throw new ApiError(`Lane with id '${id}' doesn't exist.`, 404);
        }

        await LaneDb.delete(caller, id);
        return new Response(`Lane with id '${id}' successfully deleted.`);
    }

    /**
     * Returns all lanes that are in the given parking lot.
     * @param {Caller} caller : Info relating to the user making the request.
     * @param {{}} params : Contains the id of the lot to get lanes for.
     * @public */
    async getByLot(caller, params) {
        /** @type {string} */
        let id;

        try {
            ({ id } = await idParam.validateAsync(params, { stripUnknown: true }));
        } catch (ex) {
            throw new ApiError(`Invalid input: ${ex.message}.`, 400);
        }

        if (!(await ParkingLotDb.exists(caller, id))) {
            throw new ApiError(`Parking lot with id '${id}' doesn't exist.`, 404);
        }

        const lanes = await LaneDb.find(caller, { parkingLotId: id });
        return lanes.map((lane) => lane.publicInstance());
    }
}

module.exports = new LaneController();
