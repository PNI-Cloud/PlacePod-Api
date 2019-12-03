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
const LaneRouter = require('./LaneRouter');
const OAuth2Router = require('./OAuth2Router');
const ParkingLotRouter = require('./ParkingLotRouter');
const SensorRouter = require('./SensorRouter');
const SensorLogRouter = require('./SensorLogRouter');
const ClientRouter = require('./ClientRouter');

module.exports = {
    LaneRouter,
    OAuth2Router,
    SensorRouter,
    SensorLogRouter,
    ParkingLotRouter,
    ClientRouter,
};
