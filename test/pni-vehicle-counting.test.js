
/* eslint-env mocha */

'use strict';

/* Imports */
const { expect } = require('chai');
const VehicleCounting = require('../lib/pni-vehicle-counting/index');

const FRONT_ID = '0000000000000000';
const BACK_ID = '1111111111111111';
const TIMEOUT = 10;
const INTERVAL = 20;
const DELAY = INTERVAL + 5;

/**
 * Stop execution for the specified number of milliseconds.
 * @param {number} ms : Number of milliseconds to wait. */
function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Add a new mock event to the queue.
 * @param {string} id : Should map to an id defined in Database.js
 * @param {number} count : Current vehicle count.
 * @param {number} timestamp */
function newEvent(sensorId, count, timestamp) {
    return {
        sensorId,
        count,
        time: new Date(timestamp).toISOString(),
        frameCount: 0,
    };
}

describe('Simple vehicle counting test.', () => {
    it('Two events (both seen state).', async () => {
        // Arrange
        const vehicleCounting = new VehicleCounting();
        const driveway = {
            id: '1',
            timeout: INTERVAL / 1000,
            count: 0,
            frontId: FRONT_ID,
            backId: BACK_ID,
        };

        // Act
        const result = await new Promise((resolve, reject) => {
            (async () => {
                let shouldResolve = false;
                const callback = ((err, res) => {
                    if (err) {
                        reject(err);
                    } else if (res && res.updates) {
                        driveway.count = res.updates.count;
                        driveway.state = res.updates.state;
                        if (shouldResolve) {
                            resolve(res);
                        }
                    }
                });
                // Event queue
                vehicleCounting.handleEvent(driveway, newEvent(FRONT_ID, 1, 100), callback);
                await sleep(TIMEOUT);
                shouldResolve = true;
                vehicleCounting.handleEvent(driveway, newEvent(BACK_ID, 1, 200), callback);
            })();
        });

        // Assert
        expect(result.updates.count).to.equal(1);
    });

    it('Timeout state.', async () => {
        // Arrange
        const vehicleCounting = new VehicleCounting();
        const driveway = {
            id: '1',
            timeout: INTERVAL / 1000,
            count: 0,
            frontId: FRONT_ID,
            backId: BACK_ID,
        };

        // Act
        const result = await new Promise((resolve, reject) => {
            (async () => {
                let shouldResolve = false;
                const callback = ((err, res) => {
                    if (err) {
                        reject(err);
                    } else if (res && res.updates) {
                        driveway.count = res.updates.count;
                        driveway.state = res.updates.state;
                        if (shouldResolve) {
                            resolve(res);
                        }
                    }
                });
                // Event queue
                vehicleCounting.handleEvent(driveway, newEvent(FRONT_ID, 1, 100), callback);
                shouldResolve = true;
            })();
        });

        // Assert
        expect(result.updates.count).to.equal(1);
    });

    it('Timeout then both states.', async () => {
        // Arrange
        const vehicleCounting = new VehicleCounting();
        const driveway = {
            id: '1',
            timeout: INTERVAL / 1000,
            count: 0,
            frontId: FRONT_ID,
            backId: BACK_ID,
        };

        // Act
        const result = await new Promise((resolve, reject) => {
            (async () => {
                let shouldResolve = false;
                const callback = ((err, res) => {
                    if (err) {
                        reject(err);
                    } else if (res && res.updates) {
                        driveway.count = res.updates.count;
                        driveway.state = res.updates.state;
                        if (shouldResolve) {
                            resolve(res);
                        }
                    }
                });
                // Event queue
                vehicleCounting.handleEvent(driveway, newEvent(FRONT_ID, 1, 100), callback);
                await sleep(DELAY);
                vehicleCounting.handleEvent(driveway, newEvent(FRONT_ID, 2, 200), callback);
                await sleep(TIMEOUT);
                shouldResolve = true;
                vehicleCounting.handleEvent(driveway, newEvent(BACK_ID, 1, 300), callback);
            })();
        });

        // Assert
        expect(result.updates.count).to.equal(2);
    });

    it('Repeat, both seen, single timeout states.', async () => {
        // Arrange
        const vehicleCounting = new VehicleCounting();
        const driveway = {
            id: '1',
            timeout: INTERVAL / 1000,
            count: 0,
            frontId: FRONT_ID,
            backId: BACK_ID,
        };

        // Act
        const result = await new Promise((resolve, reject) => {
            (async () => {
                let shouldResolve = false;
                const callback = ((err, res) => {
                    if (err) {
                        reject(err);
                    } else if (res && res.updates) {
                        driveway.count = res.updates.count;
                        driveway.state = res.updates.state;
                        if (shouldResolve) {
                            resolve(res);
                        }
                    }
                });
                // Event queue
                vehicleCounting.handleEvent(driveway, newEvent(FRONT_ID, 1, 100), callback);
                await sleep(TIMEOUT);
                vehicleCounting.handleEvent(driveway, newEvent(FRONT_ID, 2, 200), callback);
                await sleep(TIMEOUT);
                vehicleCounting.handleEvent(driveway, newEvent(BACK_ID, 1, 300), callback);
                await sleep(TIMEOUT);
                vehicleCounting.handleEvent(driveway, newEvent(BACK_ID, 2, 400), callback);
                shouldResolve = true;
            })();
        });

        // Assert
        expect(result.updates.count).to.equal(3);
    });

    it('Both counts reset.', async () => {
        // Arrange
        const vehicleCounting = new VehicleCounting();
        const driveway = {
            id: '1',
            timeout: INTERVAL / 1000,
            count: 0,
            frontId: FRONT_ID,
            backId: BACK_ID,
        };

        // Act
        const result = await new Promise((resolve, reject) => {
            (async () => {
                let shouldResolve = false;
                const callback = ((err, res) => {
                    if (err) {
                        reject(err);
                    } else if (res && res.updates) {
                        driveway.count = res.updates.count;
                        driveway.state = res.updates.state;
                        if (shouldResolve) {
                            resolve(res);
                        }
                    }
                });
                // Event queue
                vehicleCounting.handleEvent(driveway, newEvent(FRONT_ID, 128, 100), callback);
                shouldResolve = true;
                vehicleCounting.handleEvent(driveway, newEvent(BACK_ID, 128, 101), callback);
            })();
        });

        // Assert
        expect(result.updates.count).to.equal(0);
    });
});
