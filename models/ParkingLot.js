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
 * Represents a parking lot resource. */
class ParkingLot {
    /**
     * @param {{
     *  id: string,
     *  clientId: string,
     *  createdAt: Date,
     *  name: string,
     *  totalSpaces: number,
     *  count: number,
     * }} params : Initialization parameters.
     */
    constructor(params) {
        /**
         * Unique id of the parking lot. */
        this.id = params.id;

        /**
         * The unique id of the client that owns the parking lot. Foreign key. */
        this.clientId = params.clientId;

        /**
         * The date this object was created at. */
        this.createdAt = params.createdAt;

        /**
         * The name of the parking lot. */
        this.name = params.name;

        /**
         * The number of parking spaces that the parking lot contains. */
        this.totalSpaces = params.totalSpaces;

        /**
         * The estimated number of vehicles currently in the lot.
         * This only applies to vehicle counting. */
        this.count = params.count;
    }

    /**
     * Returns the public instance of the parking lot.
     * This should match the documented 'parkinglot' type in swagger. */
    publicInstance() {
        let { count } = this;
        if (count < 0) {
            count = 0;
        } else if (count > this.totalSpaces) {
            count = this.totalSpaces;
        }
        return {
            id: this.id,
            name: this.name,
            totalSpaces: this.totalSpaces,
            count,
        };
    }
}

module.exports = ParkingLot;
