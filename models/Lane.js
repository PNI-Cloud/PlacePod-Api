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

/**
 * Represents a lane resource. */
class Lane {
    /**
     * @param {{
     *  id: string,
     *  clientId: string,
     *  createdAt: Date,
     *  name: string,
     *  frontId: string,
     *  backId: string,
     *  parkingLotId: string,
     *  count: number,
     *  direction: boolean,
     *  timeout: number,
     *  state: { },
     * }} params : Initialization parameters.
     */
    constructor(params) {
        /**
         * Unique id of the lane. */
        this.id = params.id;

        /**
         * The unique id of the client that owns the lane. Foreign key. */
        this.clientId = params.clientId;

        /**
         * The date this object was created at. */
        this.createdAt = params.createdAt;

        /**
         * The name of the lane. */
        this.name = params.name;

        /**
         * The id of the first sensor in the lane. */
        this.frontId = params.frontId;

        /**
         * The id of the second sensor in the lane. */
        this.backId = params.backId;

        /**
         * The id of the parking lot that this lane is for. */
        this.parkingLotId = params.parkingLotId;

        /**
         * Current number of vehicles that have passed through the lane. */
        this.count = params.count;

        /**
         * The direction heading into the parking lot. true = in, false = out. */
        this.direction = params.direction;

        /**
         * Vehicle counting timeout. */
        this.timeout = params.timeout;

        /**
         * Vehicle counting state. */
        this.state = params.state;
    }

    /**
     * Returns the public instance of the lane.
     * This should match the documented 'lane' type in swagger. */
    publicInstance() {
        return {
            id: this.id,
            name: this.name,
            frontId: this.frontId,
            backId: this.backId,
            parkingLotId: this.parkingLotId,
            count: this.count,
            direction: this.direction,
        };
    }
}

module.exports = Lane;
