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
const Service = require('./Service');
/** @typedef {import('./Service').Callback} Callback */
/** @typedef {import('./Service').LaneInfo} LaneInfo */
/** @typedef {import('./Service').EventReceived} EventReceived */

/**
 * Vehicle counting module.
 * */
class VehicleCounting {
    constructor() {
        /**
         * The currently cached services.
         * @type {Object.<string, Service>}
         * @private */
        this.services = {};
    }

    /**
     * Pass the lane that created the event and the event for processing.
     * @param {LaneInfo} laneInfo
     * @param {EventReceived} eventReceived
     * @param {Callback} callback
     * @public */
    handleEvent(laneInfo, eventReceived, callback) {
        const service = new Service(laneInfo, callback);

        // Add a service to the cache. If it already exists, then update and expire the old timeout.
        if (this.services[service.laneId]) {
            this.services[service.laneId].cancelTimeout();
        }
        this.services[service.laneId] = service;

        service.handle(eventReceived);
    }

    /**
     * Remove a service from the cache.
     * @param {string} laneId : Id of the lane to clear cache of.
     * @public */
    clearState(laneId) {
        if (this.services[laneId]) {
            this.services[laneId].cancelTimeout();
            delete this.services[laneId];
        }
    }

    /**
     * Remove all services from the cache.
     * @public */
    clearCache() {
        Object.keys(this.services).forEach((laneId) => this.clearState(laneId));
    }
}

module.exports = VehicleCounting;
