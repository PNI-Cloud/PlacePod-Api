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
const AlgorithmModule = require('./Algorithm');

/**
 * Default number of seconds to wait before considering a single event as its own count. */
const defaultTimeout = 10;

/**
 * @param {string} x
 * @param {string} y
 */
function stringCompare(x, y) {
    return (x.toLowerCase() === y.toLowerCase());
}

/**
 * Generate the initial state of the sensor.
 * @param {string} id : Id of the sensor. */
function initialState(id) {
    return {
        id,
        seen: false,
        previous: {
            /** @type {number?} */
            count: null, // This should never be null after first time it has been set!
        },
        current: {
            /** @type {number?} */
            count: null,
        },
        inactive: 0, // Number of times a sensor didn't show up.
        prevChange: 0, // Previous change in count for the sensor
    };
}

/**
 * Get the number value. If it doesn't exist (is isn't a number), return 0.
 * @param {number?} value : The number to get/check. */
function numberValue(value) {
    return (typeof value === 'number') ? value : 0;
}


/**
 * Service for monitering lane's state. */
class Service {
    /**
     * @param {LaneInfo} laneInfo
     * @param {Callback} callback
     * @public */
    constructor(laneInfo, callback) {
        this.callback = callback;

        /** @private */
        this.timeoutInterval = (typeof laneInfo.timeout === 'number') ? laneInfo.timeout : defaultTimeout;

        this.laneId = laneInfo.id;
        this.totalCount = laneInfo.count;

        // Create state if it doesn't exist!
        if (!laneInfo.state) {
            /** @type {State} */
            this.frontState = initialState(laneInfo.frontId);
            /** @type {State} */
            this.backState = initialState(laneInfo.backId);
        } else {
            if (!laneInfo.state.front) {
                this.frontState = initialState(laneInfo.frontId);
            } else {
                this.frontState = laneInfo.state.front;

                // The front sensor was changed!
                if (!stringCompare(this.frontState.id, laneInfo.frontId)) {
                    this.frontState = initialState(laneInfo.frontId);
                }
            }

            if (!laneInfo.state.back) {
                this.backState = initialState(laneInfo.backId);
            } else {
                this.backState = laneInfo.state.back;

                // The back sensor was changed!
                if (!stringCompare(this.backState.id, laneInfo.backId)) {
                    this.backState = initialState(laneInfo.backId);
                }
            }
        }
    }

    /**
     * Main event handler method. Pass a packet to start the algorithm.
     * @param {EventReceived} eventReceived
     * @public */
    handle(eventReceived) {
        const isInFront = stringCompare(eventReceived.sensorId, this.frontState.id);

        const event = {
            count: eventReceived.count,
            time: eventReceived.time,
            frameCount: eventReceived.frameCount,
            wasReset: (eventReceived.count === 128),
        };

        if (event.wasReset) {
            event.count = 0;
            this.stateReset(isInFront, event);
            return;
        }
        this.stateSingle(isInFront, event);
    }

    /**
     * If a timeout is in process, then it will be canceled.
     * Call this when the lane is about to handle a new packet.
     * @public */
    cancelTimeout() {
        if (this.timeout) {
            clearTimeout(this.timeout);
            this.timeout = null;
        }
    }

    /**
     * Get the corresponding state.
     * @param {boolean} isInFront : Is the sensor the front sensor?
     * @private */
    getState(isInFront) {
        return (isInFront) ? this.frontState : this.backState;
    }

    /**
     * Set the previous state to the current one, then assign the current state to the passed state.
     * @param {string} isInFront : Either "front" or "back".
     * @param {Event} event : The new current state.
     * @private */
    updateState(isInFront, event) {
        const state = this.getState(isInFront);
        state.previous = state.current;
        state.current = event;
    }

    /**
     * Perform delta calculations to update the lane's total count.
     * This relies on Matlab codegen to process the data.
     * @private */
    calculate() {
        const front = {
            current: numberValue(this.frontState.current.count),
            previous: numberValue(this.frontState.previous.count),
            inactive: numberValue(this.frontState.inactive),
            prevChange: numberValue(this.frontState.prevChange),
        };

        const back = {
            current: numberValue(this.backState.current.count),
            previous: numberValue(this.backState.previous.count),
            inactive: numberValue(this.backState.inactive),
            prevChange: numberValue(this.backState.prevChange),
        };

        const results = AlgorithmModule.Process(front, back);

        this.totalChange = results.totalChange;
        this.totalCount += this.totalChange;
        this.frontState.inactive = results.sensor1Inactive;
        this.backState.inactive = results.sensor2Inactive;
        this.frontState.prevChange = results.sensor1PrevChange;
        this.backState.prevChange = results.sensor2PrevChange;

        // Mark each sensor as seen after being processed.
        this.frontState.seen = false;
        this.backState.seen = false;
    }

    /**
     * Send algorithm results out.
     * @private */
    sendResponse() {
        this.callback(null, {
            id: this.laneId,
            updates: {
                count: this.totalCount,
                change: this.totalChange,
                state: {
                    front: this.frontState,
                    back: this.backState,
                },
            },
        });
    }

    /* Processing state methods */

    /**
     * Initial state reached when a new packet arrives. Look at the
     * state of the lane to decide which state to move to.
     * @param {boolean} isInFront : Is the sensor from the packet the front sensor?
     * @param {Event} event : The most current state of the sensor's who's packet was received.
     * @private */
    stateSingle(isInFront, event) {
        const state = this.getState(isInFront);

        if (state.seen) { // Repeat
            this.stateRepeat(isInFront, event);
            return;
        }
        state.seen = true;

        if (this.getState(!isInFront).seen) { // Both
            this.stateBoth(isInFront, event);
            return;
        }

        // Don't know yet, start timeout and wait for next event.
        this.updateState(isInFront, event);
        this.sendResponse();
        this.stateStartTimeout(isInFront, event);
    }

    /**
     * The same sensor has been seen twice in a row. Make note that the other direction
     * hasn't changed, perform calculations, update the internal state,
     * then start a timeout.
     * @param {boolean} isInFront : Is the sensor from the packet the front sensor?
     * @param {Event} event : The most current state of the sensor's who's packet was received.
     * @private */
    stateRepeat(isInFront, event) {
        const state = this.getState(isInFront);
        const otherState = this.getState(!isInFront);

        // Need to process prior event
        this.updateState(!isInFront, otherState.current);
        this.calculate();

        this.updateState(isInFront, event);
        state.seen = true;
        this.sendResponse();
        this.stateStartTimeout(isInFront, event);
    }

    /**
     * Both sensors in the lane have been seen. This is the ideal case that
     * should be hit. Perform calculations and then update the internal state.
     * @param {boolean} isInFront : Is the sensor from the packet the front sensor?
     * @param {Event} event : The most current state of the sensor's who's packet was received.
     * @private */
    stateBoth(isInFront, event) {
        this.updateState(isInFront, event);
        this.calculate();

        this.sendResponse();
    }

    /**
     * Starts a timeout that lasts `this.timeoutInterval` seconds.
     * The callback is invoked if this period passes. The callback will never be invoked
     * if the interval is 0.
     * @param {boolean} isInFront : Is the sensor from the packet the front sensor?
     * @param {Event} event : The most current state of the sensor's who's packet was received.
     * @private */
    stateStartTimeout(isInFront, event) {
        if (this.timeoutInterval > 0) {
            this.timeout = setTimeout(() => {
                this.stateTimeout(isInFront, event);
            }, 1000 * this.timeoutInterval);
        }
    }

    /**
     * When the timeout expires, make note that the other direction hasn't changed, perform
     * calculations, then update the internal state.
     * @param {boolean} isInFront : Is the sensor from the packet the front sensor?
     * @private */
    stateTimeout(isInFront) {
        const otherState = this.getState(!isInFront);

        this.updateState(!isInFront, otherState.current);
        this.calculate();

        this.sendResponse();
    }

    /**
     * When the sensor is recalibrated or rebooted, its internal count is set to 0.
     * Also reset its internal state to its initial settings.
     * @param {boolean} isInFront : Is the sensor from the packet the front sensor?
     * @param {Event} event : The most current state of the sensor's who's packet was received.
     * @private */
    stateReset(isInFront, event) {
        const state = this.getState(isInFront);

        state.inactive = 0;
        state.prevChange = 0;
        state.seen = false;
        this.updateState(isInFront, event);

        this.sendResponse();
    }
}

module.exports = Service;

/**
 * @typedef {{
 *  count: number,
 *  time: Date | string,
 *  frameCount: number,
 *  wasReset: boolean,
 * }} Event
 *
 * @typedef {{
 *  id: string,
 *  seen: boolean,
 *  previous: Event,
 *  current: Event,
 *  inactive: number,
 *  prevChange: number,
 * }} State
 *
 * @typedef {function(
 *  Error,
 *  {
 *      id: string,
 *      updates: {
 *          count: number,
 *          change: number,
 *          state: { front: State, back: State }
 *      },
 *  }
 * )} Callback
 *
 * @typedef {{
 *  id: string,
 *  timeout: number,
 *  count: number,
 *  frontId: string,
 *  backId: string,
 *  state: { front: State, back: State },
 * }} LaneInfo
 *
 * @typedef {{
 *  sensorId: string,
 *  count: number,
 *  time: Date|string,
 *  frameCount: number,
 * }} EventReceived
 * */
