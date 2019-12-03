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

// Postgres

const AccessTokenDb = require('./postgres/AccessTokenDb');
const ClientDb = require('./postgres/ClientDb');
const LaneDb = require('./postgres/LaneDb');
const ParkingLotDb = require('./postgres/ParkingLotDb');
const Postgres = require('./postgres/Postgres');
const SensorDb = require('./postgres/SensorDb');
const SensorLogDb = require('./postgres/SensorLogDb');

const startup = Postgres.setup;

// MongoDb

// const AccessTokenDb = require('./mongoDb/AccessTokenDb');
// const ClientDb = require('./mongoDb/ClientDb');
// const LaneDb = require('./mongoDb/LaneDb');
// const ParkingLotDb = require('./mongoDb/ParkingLotDb');
// const MongoDb = require('./mongoDb/MongoDb');
// const SensorDb = require('./mongoDb/SensorDb');
// const SensorLogDb = require('./mongoDb/SensorLogDb');

// const startup = () => MongoDb.setup();

/**
 * Database abtraction layer.
 * @summary Provide this with specific database resource implemtations.
 * */
module.exports = {
    /** Call this to start up the database. */
    startup,

    /** Database layer for access tokens. */
    AccessTokenDb,

    /** Database layer for clients. */
    ClientDb,

    /** Database layer for lanes. */
    LaneDb,

    /** Database layer for parking lots. */
    ParkingLotDb,

    /** Database layer for sensors. */
    SensorDb,

    /** Database layer for sensor logs. */
    SensorLogDb,
};
