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
const { ApiError, Response, Sensor } = require('../../models');
const { LaneDb, ParkingLotDb, SensorDb } = require('../../database');
const UplinkService = require('../../lib/UplinkService');
/** @typedef {import('../../models/Caller')} Caller */

/** Query schema for searching for sensors to get. */
const searchQuery = Joi.object()
    .keys({
        state: Joi.string()
            .valid(
                Sensor.states.vacant,
                Sensor.states.occupied,
                Sensor.states.offline,
            ).insensitive(),
        type: Joi.string(),
    });

/** Body schema for creating a sensor. */
const createBody = Joi.object()
    .keys({
        id: Joi.string().hex().length(16).required(),
        name: Joi.string().required(),
        type: Joi.string(),
        parkingLotId: Joi.string(),
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

/** Body schema for updating a sensor. */
const updateBody = Joi.object()
    .min(1)
    .keys({
        name: Joi.string(),
        type: Joi.string(),
        parkingLotId: Joi.string(),
    });

/** Body schema for submitting a generic uplink. */
const uplinkBody = Joi.object()
    .keys({
        payload: Joi.string().hex().required(),
        port: Joi.number().integer().positive().required(),
        frameCount: Joi.number().integer().positive().allow(0),
        rssi: Joi.number(),
        snr: Joi.number(),
        gatewayId: Joi.string(),
        gatewayTime: Joi.date().iso(),
        frequency: Joi.number().positive().allow(0),
        dataRate: Joi.string(),
    });

/** Body schema for submitting a TTN uplink. */
const ttnBody = Joi.object()
    .keys({
        hardware_serial: Joi.string().hex().length(16).required(),
        port: Joi.number().integer().positive().required(),
        counter: Joi.number().integer().positive().allow(0),
        payload_raw: Joi.string().base64().required(),
        metadata: Joi.object().keys({
            time: Joi.date().iso().allow(''),
            frequency: Joi.number().positive().allow(0),
            data_rate: Joi.string(),
            gateways: Joi.array().items(Joi.object().keys({
                gtw_id: Joi.string(),
                rssi: Joi.number(),
                snr: Joi.number(),
            })),
        }),
    });

/** Body schema for submitting a MachineQ uplink. */
const machineqBody = Joi.object()
    .keys({
        Time: Joi.date().iso(),
        DevEUI: Joi.string().hex().length(16).required(),
        FPort: Joi.number().integer().positive().required(),
        FCntUp: Joi.number().integer().positive().allow(0),
        payload_hex: Joi.string().hex().required(),
        GatewayRSSI: Joi.number(),
        GatewaySNR: Joi.number(),
        SpreadingFactor: Joi.string(),
        GatewayID: Joi.string(),
    });

/** Body schema for submitting a Loriot uplink. */
const loriotBody = Joi.object()
    .keys({
        EUI: Joi.string().hex().length(16).required(),
        ts: Joi.number().integer().positive(),
        fcnt: Joi.number().integer().positive().allow(0),
        port: Joi.number().integer().positive().required(),
        data: Joi.string().hex().required(),
        freq: Joi.number(),
        dr: Joi.string(),
        rssi: Joi.number(),
        snr: Joi.number(),
    });

/** Body schema for submitting a ChirpStack uplink. */
const chirpStackBody = Joi.object()
    .keys({
        devEUI: Joi.string().hex().length(16).required(),
        rxInfo: Joi.array().items(Joi.object().keys({
            gatewayID: Joi.string(),
            time: Joi.date().iso().allow(''),
            rssi: Joi.number(),
            loRaSNR: Joi.number(),
        })),
        txInfo: Joi.object().keys({
            frequency: Joi.number().positive().allow(0),
            dr: Joi.number(),
        }),
        fCnt: Joi.number(),
        fPort: Joi.number().required(),
        data: Joi.string().base64().required(),
    });

    /** Body schema for submitting a Senet uplink. */
    const senetBody = Joi.object()
        .keys({
            devEui: Joi.string().hex().length(16).required(),
            gwEui: Joi.string(),
            pdu: Joi.string().hex().required(),
            port: Joi.number().required(),
            seqno: Joi.number(),
            txtime: Joi.date().iso().allow(''),
            datarate: Joi.number(),
            freq: Joi.number(),
            rssi: Joi.number(),
            snr: Joi.number(),
        });

/**
 * Expose endpoints for managing the 'sensor' resource.
 * Minimal Scopes: [user] */
class SensorController {
    /**
     * Returns all sensors belonging to the user.
     * @param {Caller} caller : Info relating to the user making the request.
     * @param {{}} query : Contains optional search filters.
     * @public */
    async getAll(caller, query) {
        /** @type {{ state: string, type: string }} */
        let filters;

        try {
            filters = await searchQuery.validateAsync(query, { stripUnknown: true });
        } catch (ex) {
            throw new ApiError(`Invalid input: ${ex.message}.`, 400);
        }

        const sensors = await SensorDb.find(caller, filters);
        return sensors.map((sensor) => sensor.publicInstance());
    }

    /**
     * Creates a new sensor with the given id.
     * @param {Caller} caller : Info relating to the user making the request.
     * @param {{}} body : Contains fields for the new sensor.
     * @public */
    async create(caller, body) {
        /**
         * @type {{
         *  id: string,
         *  name: string,
         *  type: string,
         *  parkingLotId: string?,
         * }}
         */
        let newSensor;

        try {
            newSensor = await createBody.validateAsync(body, { stripUnknown: true });
        } catch (ex) {
            throw new ApiError(`Invalid input: ${ex.message}.`, 400);
        }

        if (await SensorDb.exists(caller, newSensor.id)) {
            throw new ApiError(`Sensor with id '${newSensor.id}' already exists.`, 400);
        }
        if (newSensor.parkingLotId) {
            if (!(await ParkingLotDb.exists(caller, newSensor.parkingLotId))) {
                throw new ApiError(`Parking lot with id '${newSensor.parkingLotId}' doesn't exist.`, 404);
            }
        }

        const id = await SensorDb.create(caller, newSensor);
        return { id };
    }

    /**
     * Returns the sensor that matches the given id.
     * @param {Caller} caller : Info relating to the user making the request.
     * @param {{}} params : Contains the id of the sensor to get.
     * @public */
    async get(caller, params) {
        /** @type {string} */
        let id;

        try {
            ({ id } = await sensorIdParam.validateAsync(params, { stripUnknown: true }));
        } catch (ex) {
            throw new ApiError(`Invalid input: ${ex.message}.`, 400);
        }

        const sensor = await SensorDb.findOne(caller, id);
        if (!sensor) {
            throw new ApiError(`Sensor with id '${id}' doesn't exist.`, 404);
        }

        return sensor.publicInstance();
    }

    /**
     * Update the sensor that matches the given id.
     * @param {Caller} caller : Info relating to the user making the request.
     * @param {{}} params : Contains the id of the sensor to update.
     * @param {{}} body : Contains fields to be updated.
     * @public */
    async update(caller, params, body) {
        /** @type {string} */
        let id;

        /**
         * @type {{
         *  name: string,
         *  type: string,
         *  parkingLotId: string,
         * }}
         */
        let updates;

        try {
            [{ id }, updates] = await Promise.all([
                sensorIdParam.validateAsync(params, { stripUnknown: true }),
                updateBody.validateAsync(body, { stripUnknown: true }),
            ]);
        } catch (ex) {
            throw new ApiError(`Invalid input: ${ex.message}.`, 400);
        }

        const sensor = await SensorDb.findOne(caller, id);
        if (!sensor) {
            throw new ApiError(`Sensor with id '${id}' doesn't exist.`, 404);
        }

        if (
            updates.parkingLotId
            && updates.parkingLotId !== sensor.parkingLotId
            && !(await ParkingLotDb.exists(caller, updates.parkingLotId))
        ) {
            throw new ApiError(`Parking lot with id '${updates.parkingLotId}' doesn't exist.`, 404);
        }

        await SensorDb.update(caller, id, updates);
        return new Response(`Sensor with id '${id}' successfully updated.`);
    }

    /**
     * Delete the sensor that matches the given id.
     * @param {Caller} caller : Info relating to the user making the request.
     * @param {{}} params : Contains the id of the sensor to delete.
     * @public */
    async delete(caller, params) {
        /** @type {string} */
        let id;

        try {
            ({ id } = await sensorIdParam.validateAsync(params, { stripUnknown: true }));
        } catch (ex) {
            throw new ApiError(`Invalid input: ${ex.message}.`, 400);
        }

        if (!(await SensorDb.exists(caller, id))) {
            throw new ApiError(`Sensor with id '${id}' doesn't exist.`, 404);
        }

        const lanes = await LaneDb.find(caller, { sensorId: id });
        if (lanes.length) {
            throw new ApiError(`Sensor with id '${id}' is in ${lanes.length} lane(s)`, 400);
        }

        await SensorDb.delete(caller, id);
        return new Response(`Sensor with id '${id}' successfully deleted.`);
    }

    /**
     * Process an uplink for the sensor that matches the given id.
     * @param {Caller} caller : Info relating to the user making the request.
     * @param {{}} params : Contains the id of the sensor who's uplink this is.
     * @param {{}} body : Contains uplink info including raw payload and other fields.
     * @public */
    async uplink(caller, params, body) {
        /** @type {string} */
        let id;

        /**
         * @type {{
         *  payload: string,
         *  port: number,
         *  frameCount: number,
         *  rssi: number,
         *  snr: number,
         *  gatewayId: string,
         *  gatewayTime: string,
         *  frequency: number,
         *  dataRate: string,
         * }}
         */
        let uplink;

        try {
            [{ id }, uplink] = await Promise.all([
                sensorIdParam.validateAsync(params, { stripUnknown: true }),
                uplinkBody.validateAsync(body, { stripUnknown: true }),
            ]);
        } catch (ex) {
            throw new ApiError(`Invalid input: ${ex.message}.`, 400);
        }
        uplink.network = 'Generic';

        await UplinkService.process(caller, id, uplink);
        return new Response(`Uplink for '${id}' successfully processed.`);
    }

    /**
     * Process an uplink from TTN for the sensor that matches the given id.
     * @param {Caller} caller : Info relating to the user making the request.
     * @param {{}} body : Contains ttn uplink info including raw payload and other fields.
     * @public */
    async uplinkTtn(caller, body) {
        /**
         * @type {{
         *  hardware_serial: string,
         *  port: number,
         *  counter: number,
         *  payload_raw: string,
         *  metadata: {
         *      time: string|Date,
         *      frequency: number,
         *      data_rate: string,
         *      gateways: [{
         *          gtw_id: string,
         *          rssi: number,
         *          snr: number,
         *      }],
         *  },
         * }}
         */
        let uplink;

        try {
            uplink = await ttnBody.validateAsync(body, { stripUnknown: true });
        } catch (ex) {
            throw new ApiError(`Invalid input: ${ex.message}.`, 400);
        }

        const id = uplink.hardware_serial;
        const uplinkPacket = {
            payload: Buffer.from(uplink.payload_raw, 'base64').toString('hex'),
            port: uplink.port,
            frameCount: uplink.counter,
            frequency: uplink.metadata.frequency,
            dataRate: uplink.metadata.data_rate,
            gatewayTime: uplink.metadata.time,
            network: 'TTN',
        };
        if (uplink.metadata.gateways.length > 0) {
            uplinkPacket.rssi = uplink.metadata.gateways[0].rssi;
            uplinkPacket.snr = uplink.metadata.gateways[0].snr;
            uplinkPacket.gatewayId = uplink.metadata.gateways[0].gtw_id;
        }

        await UplinkService.process(caller, id, uplinkPacket);
        return new Response(`Uplink for '${id}' successfully processed.`);
    }

    /**
     * Process an uplink from MachineQ for the sensor that matches the given id.
     * @param {Caller} caller : Info relating to the user making the request.
     * @param {{}} body : Contains MachineQ uplink info including raw payload and other fields.
     * @public */
    async uplinkMachineQ(caller, body) {
        /**
         * @type {{
         *  Time: string|Date
         *  DevEUI: string,
         *  FPort: number,
         *  FCntUp: number,
         *  payload_hex: string,
         *  GatewayRSSI: number,
         *  GatewaySNR: number,
         *  SpreadingFactor: string,
         *  GatewayID: string,
         * }}
         */
        let uplink;

        try {
            uplink = await machineqBody.validateAsync(body, { stripUnknown: true });
        } catch (ex) {
            throw new ApiError(`Invalid input: ${ex.message}.`, 400);
        }

        // Format the MachineQ uplink, then send it for processing.
        const id = uplink.DevEUI;
        const uplinkPacket = {
            payload: uplink.payload_hex,
            port: uplink.FPort,
            frameCount: uplink.FCntUp,
            rssi: uplink.GatewayRSSI,
            snr: uplink.GatewaySNR,
            gatewayId: uplink.GatewayID,
            gatewayTime: uplink.Time,
            frequency: null,
            dadtaRate: `SF${uplink.SpreadingFactor}`,
            network: 'MachineQ',
        };

        await UplinkService.process(caller, id, uplinkPacket);
        return new Response(`Uplink for '${id}' successfully processed.`);
    }

    /**
     * Process an uplink from Loriot for the sensor that matches the given id.
     * @param {Caller} caller : Info relating to the user making the request.
     * @param {{}} body : Contains Loriot uplink info including raw payload and other fields.
     * @public */
    async uplinkLoriot(caller, body) {
        /**
         * @type {{
         *  EUI: string,
         *  ts: number,
         *  fcnt: number,
         *  port: number,
         *  data: string,
         *  freq: number,
         *  dr: string,
         *  rssi: number,
         *  snr: number,
         * }}
         */
        let uplink;

        try {
            uplink = await loriotBody.validateAsync(body, { stripUnknown: true });
        } catch (ex) {
            throw new ApiError(`Invalid input: ${ex.message}.`, 400);
        }

        // Format the Loriot uplink, then send it for processing.
        const id = uplink.EUI;
        const uplinkPacket = {
            payload: uplink.data,
            port: uplink.port,
            frameCount: uplink.fcnt,
            rssi: uplink.rssi,
            snr: uplink.snr,
            gatewayId: null,
            gatewayTime: new Date(uplink.ts).toISOString(),
            frequency: uplink.freq / 1000000,
            dataRate: uplink.dr,
            network: 'Loriot',
        };

        await UplinkService.process(caller, id, uplinkPacket);
        return new Response(`Uplink for '${id}' successfully processed.`);
    }

    /**
     * Process an uplink from ChirpStack for the sensor that matches the given id.
     * @param {Caller} caller : Info relating to the user making the request.
     * @param {{}} body : Contains ChirpStack uplink info including raw payload and other fields.
     * @public */
    async uplinkChirpStack(caller, body) {
        /**
         * @type {{
         *  devEUI: string,
         *  rxInfo: [{
         *      gatewayID: string,
         *      time: string|Date,
         *      rssi: number,
         *      loRaSNR: number,
         *  }],
         *  txInfo: {
         *      frequency: number,
         *      dr: number,
         *  },
         *  fCnt: number,
         *  fPort: number,
         *  data: string,
         * }}
         */
        let uplink;

        try {
            uplink = await chirpStackBody.validateAsync(body, { stripUnknown: true });
        } catch (ex) {
            throw new ApiError(`Invalid input: ${ex.message}.`, 400);
        }

        // Format the Loriot uplink, then send it for processing.
        const id = uplink.devEUI;
        const uplinkPacket = {
            payload: Buffer.from(uplink.data, 'base64').toString('hex'),
            port: uplink.fPort,
            frameCount: uplink.fCnt,
            frequency: uplink.txInfo.frequency / 1000000,
            dataRate: `ChirpStack ${uplink.txInfo.dr}`,
            network: 'ChirpStack',
        };
        if (uplink.rxInfo.length > 0) {
            uplinkPacket.rssi = uplink.rxInfo[0].rssi;
            uplinkPacket.snr = uplink.rxInfo[0].loRaSNR;
            uplinkPacket.gatewayId = uplink.rxInfo[0].gatewayID;
            if (uplink.rxInfo[0].time) {
                uplinkPacket.gatewayTime = uplink.rxInfo[0].time;
            }
        }

        await UplinkService.process(caller, id, uplinkPacket);
        return new Response(`Uplink for '${id}' successfully processed.`);
    }

    /**
     * Process an uplink from Senet for the sensor that matches the given id.
     * @param {Caller} caller : Info relating to the user making the request.
     * @param {{}} body : Contains Senet uplink info including raw payload and other fields.
     * @public */
    async uplinkSenet(caller, body) {
        /**
         * @type {{
         *  devEui: string,
         *  gwEui: string,
         *  pdu: string,
         *  port: number,
         *  seqno: number,
         *  txtime: string,
         *  datarate: number,
         *  freq: number,
         *  rssi: number,
         *  snr: number,
         * }}
        */
        let uplink;

        try {
            uplink = await senetBody.validateAsync(body, { stripUnknown: true });
        } catch (ex) {
            throw new ApiError(`Invalid input: ${ex.message}.`, 400);
        }

        // Format the Loriot uplink, then send it for processing.
        const id = uplink.devEui;
        const uplinkPacket = {
            payload: uplink.pdu,
            port: uplink.port,
            frameCount: uplink.seqno,
            rssi: uplink.rssi,
            snr: uplink.snr,
            gatewayId: uplink.gwEui,
            gatewayTime: uplink.txtime,
            frequency: uplink.freq,
            dataRate: `Senet ${uplink.datarate}`,
            network: 'Senet',
        };

        await UplinkService.process(caller, id, uplinkPacket);
        return new Response(`Uplink for '${id}' successfully processed.`);
    }

    /**
     * Returns all sensors that are in the given parking lot.
     * @param {Caller} caller : Info relating to the user making the request.
     * @param {{}} params : Contains the id of the lot to get sensors for.
     * @param {{}} query : Contains optional search filters.
     * @public */
    async getByLot(caller, params, query) {
        /** @type {string} */
        let id;

        /** @type {{ state: string, type: string }} */
        let filters;

        try {
            [{ id }, filters] = await Promise.all([
                idParam.validateAsync(params, { stripUnknown: true }),
                searchQuery.validateAsync(query, { stripUnknown: true }),
            ]);
        } catch (ex) {
            throw new ApiError(`Invalid input: ${ex.message}.`, 400);
        }

        if (!(await ParkingLotDb.exists(caller, id))) {
            throw new ApiError(`Parking lot with id '${id}' doesn't exist.`, 404);
        }

        const sensors = await SensorDb.find(caller, { parkingLotId: id, ...filters });
        return sensors.map((sensor) => sensor.publicInstance());
    }

    /**
     * Returns all sensors that are in the given lane.
     * @param {Caller} caller : Info relating to the user making the request.
     * @param {{}} params : Contains the id of the lane to get sensors for.
     * @param {{}} query : Contains optional search filters.
     * @public */
    async getByLane(caller, params, query) {
        /** @type {string} */
        let id;

        /** @type {{ state: string, type: string }} */
        let filters;

        try {
            [{ id }, filters] = await Promise.all([
                idParam.validateAsync(params, { stripUnknown: true }),
                searchQuery.validateAsync(query, { stripUnknown: true }),
            ]);
        } catch (ex) {
            throw new ApiError(`Invalid input: ${ex.message}.`, 400);
        }

        if (!(await LaneDb.exists(caller, id))) {
            throw new ApiError(`Lane with id '${id}' doesn't exist.`, 404);
        }

        const sensors = await SensorDb.find(caller, { laneId: id, ...filters });
        return sensors.map((sensor) => sensor.publicInstance());
    }
}

module.exports = new SensorController();
