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
const Packet = require('../models/Packet');

/**
 * Factory class for creating a set of packets.
 * Currently supports payloads decoded using `cayenee-lpp` module. */
class PacketFactory {
    /**
     * Turn the array of decoded objects into an array of packets.
     * @param {object[]} results : Array of decoded objects.
     * @public */
    create(results) {
        /** @type {Packet[]} */
        const packets = [];
        if (!results.length) {
            return packets;
        }
        packets.push(new Packet());
        for (const result of results) {
            Object.keys(result).forEach((key) => {
                if (!packets[packets.length - 1].trySet(key, result[key])) {
                    // Add a new packet and try to set the value again...
                    const packet = new Packet();
                    packet.trySet(key, result[key]);
                    packets.push(packet);
                }
            });
        }

        return packets;
    }
}

module.exports = new PacketFactory();
