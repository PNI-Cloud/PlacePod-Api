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
 * @typedef {{
 *  current: number,
 *  previous: number,
 *  inactive: number,
 *  prevChange: number,
 * }} Sensor
 * */

/**
 * @param {Sensor} sensor */
function getDifference(sensor) {
    return (sensor.current >= sensor.previous)
        ? sensor.current - sensor.previous
        : (128 + sensor.current) - sensor.previous;
}

/**
 * @param {Sensor} sensor */
function getInactiveCount(sensor) {
    const inactiveCount = sensor.inactive + 1;
    return (inactiveCount > 127) ? 127 : inactiveCount;
}

module.exports = {
    /**
     * @param {Sensor} s1
     * @param {Sensor} s2 */
    Process: (s1, s2) => {
        const sensor1 = { ...s1 };
        const sensor2 = { ...s2 };

        const deltaSensor1 = getDifference(sensor1);
        const deltaSensor2 = getDifference(sensor2);

        if (deltaSensor1 === 0) {
            sensor1.inactive = getInactiveCount(sensor1);
        }
        if (deltaSensor2 === 0) {
            sensor2.inactive = getInactiveCount(sensor2);
        }

        let adjustedSensor1 = (sensor1.inactive > 0) ? 0 : deltaSensor1;
        let adjustedSensor2 = (sensor2.inactive > 0) ? 0 : deltaSensor2;

        if (
            adjustedSensor1 === 0
            && adjustedSensor2 === 0
            && sensor1.prevChange === 0
            && sensor2.prevChange === 0
        ) {
            adjustedSensor1 = 1;
            adjustedSensor2 = 1;
        }

        sensor1.prevChange = adjustedSensor1;
        sensor2.prevChange = adjustedSensor2;

        const totalChange = (adjustedSensor1 > adjustedSensor2) ? adjustedSensor1 : adjustedSensor2;

        if (deltaSensor1 !== 0) {
            sensor1.inactive = 0;
        }
        if (deltaSensor2 !== 0) {
            sensor2.inactive = 0;
        }

        return {
            totalChange,
            sensor1Inactive: sensor1.inactive,
            sensor2Inactive: sensor2.inactive,
            sensor1PrevChange: sensor1.prevChange,
            sensor2PrevChange: sensor2.prevChange,
        };
    },
};
