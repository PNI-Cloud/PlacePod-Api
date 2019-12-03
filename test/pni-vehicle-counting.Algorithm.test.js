/* eslint-env mocha */

'use strict';

const { expect } = require('chai');
const AlgorithmModule = require('../lib/pni-vehicle-counting/Algorithm');

/**
 * Generates the sensor object to be passed to the algorithm module.
 * @param {number} current : Current count.
 * @param {number} previous : Previous count.
 * @param {number} inactive : Number of times the sensor has missed an event.
 * @param {number} prevChange : Previous count change. */
function makeInput(current, previous, inactive, prevChange) {
    return {
        current,
        previous,
        inactive,
        prevChange,
    };
}

/**
 * Generate expected ouput.
 * @param {number} totalChange : Calculated change.
 * @param {number} sensor1Inactive : Number of times the 1st sensor has missed an event.
 * @param {number} sensor2Inactive : Number of times the 2nd sensor has missed an event.
 * @param {number} sensor1PrevChange : 1st sensor previous count change.
 * @param {number} sensor2PrevChange : 2nd sensor previous count change.
 */
function makeOutput(
    totalChange,
    sensor1Inactive,
    sensor2Inactive,
    sensor1PrevChange,
    sensor2PrevChange,
) {
    return {
        totalChange,
        sensor1Inactive,
        sensor2Inactive,
        sensor1PrevChange,
        sensor2PrevChange,
    };
}

describe('pni-vehicle-counting Algorithm module unit test.', () => {
    it('Both sensors changed by 1.', () => {
        // Arrange
        const front = makeInput(1, 0, 0, 0);
        const back = makeInput(1, 0, 0, 0);
        const expected = makeOutput(1, 0, 0, 1, 1);

        // Act
        const results = AlgorithmModule.Process(front, back);

        // Assert
        expect(results).to.eql(expected);
    });

    it('Front sensor changed by 1.', () => {
        // Arrange
        const front = makeInput(1, 0, 0, 0);
        const back = makeInput(0, 0, 0, 0);
        const expected = makeOutput(1, 0, 1, 1, 0);

        // Act
        const results = AlgorithmModule.Process(front, back);

        // Assert
        expect(results).to.eql(expected);
    });

    it('Back sensor changed by 1.', () => {
        // Arrange
        const front = makeInput(0, 0, 0, 0);
        const back = makeInput(1, 0, 0, 0);
        const expected = makeOutput(1, 1, 0, 0, 1);

        // Act
        const results = AlgorithmModule.Process(front, back);

        // Assert
        expect(results).to.eql(expected);
    });

    it('Front sensor changed by 2.', () => {
        // Arrange
        const front = makeInput(2, 0, 0, 0);
        const back = makeInput(0, 0, 0, 0);
        const expected = makeOutput(2, 0, 1, 2, 0);

        // Act
        const results = AlgorithmModule.Process(front, back);

        // Assert
        expect(results).to.eql(expected);
    });

    it('Back sensor changed by 2.', () => {
        // Arrange
        const front = makeInput(0, 0, 0, 0);
        const back = makeInput(2, 0, 0, 0);
        const expected = makeOutput(2, 1, 0, 0, 2);

        // Act
        const results = AlgorithmModule.Process(front, back);

        // Assert
        expect(results).to.eql(expected);
    });

    it('Front sensor changed by 2 and back changed by 1.', () => {
        // Arrange
        const front = makeInput(2, 0, 0, 0);
        const back = makeInput(1, 0, 0, 0);
        const expected = makeOutput(2, 0, 0, 2, 1);

        // Act
        const results = AlgorithmModule.Process(front, back);

        // Assert
        expect(results).to.eql(expected);
    });

    it('Back sensor changed by 2 and front changed by 1.', () => {
        // Arrange
        const front = makeInput(1, 0, 0, 0);
        const back = makeInput(2, 0, 0, 0);
        const expected = makeOutput(2, 0, 0, 1, 2);

        // Act
        const results = AlgorithmModule.Process(front, back);

        // Assert
        expect(results).to.eql(expected);
    });

    it('Front sensor changed by 1 (assuming the back sensor changed by 1 prior).', () => {
        // Arrange
        const front = makeInput(1, 0, 1, 0);
        const back = makeInput(1, 1, 0, 1);
        const expected = makeOutput(0, 0, 1, 0, 0); // Count shouldn't increase in this case.

        // Act
        const results = AlgorithmModule.Process(front, back);

        // Assert
        expect(results).to.eql(expected);
    });

    it('Back sensor changed by 1 (assuming the front sensor changed by 1 prior).', () => {
        // Arrange
        const front = makeInput(1, 1, 0, 1);
        const back = makeInput(1, 0, 1, 0);
        const expected = makeOutput(0, 1, 0, 0, 0); // Count shouldn't increase in this case.

        // Act
        const results = AlgorithmModule.Process(front, back);

        // Assert
        expect(results).to.eql(expected);
    });

    it('Special case where 0\'s alternate on sensors (set off by front).', () => {
        // Arrange
        const front = makeInput(2, 1, 1, 0);
        const back = makeInput(1, 1, 0, 0);
        const expected = makeOutput(1, 0, 1, 1, 1); // Count should increase by one in this case.

        // Act
        const results = AlgorithmModule.Process(front, back);

        // Assert
        expect(results).to.eql(expected);
    });

    it('Special case where 0\'s alternate on sensors (set off by back).', () => {
        // Arrange
        const front = makeInput(1, 1, 0, 0);
        const back = makeInput(2, 1, 1, 0);
        const expected = makeOutput(1, 1, 0, 1, 1); // Count should increase by one in this case.

        // Act
        const results = AlgorithmModule.Process(front, back);

        // Assert
        expect(results).to.eql(expected);
    });

    it('Front sensor count rolled over and changed by a total of 3.', () => {
        // Arrange
        const front = makeInput(1, 126, 0, 0);
        const back = makeInput(0, 0, 0, 0);
        const expected = makeOutput(3, 0, 1, 3, 0);

        // Act
        const results = AlgorithmModule.Process(front, back);

        // Assert
        expect(results).to.eql(expected);
    });

    it('Back sensor count rolled over and changed by a total of 3.', () => {
        // Arrange
        const front = makeInput(0, 0, 0, 0);
        const back = makeInput(1, 126, 0, 0);
        const expected = makeOutput(3, 1, 0, 0, 3);

        // Act
        const results = AlgorithmModule.Process(front, back);

        // Assert
        expect(results).to.eql(expected);
    });

    it('Nothing changed (all 0 input). This should hit special case. Also validates that negatives are guarded against.', () => {
        // Arrange
        const front = makeInput(0, 0, 0, 0);
        const back = makeInput(0, 0, 0, 0);
        const expected = makeOutput(1, 1, 1, 1, 1);

        // Act
        const results = AlgorithmModule.Process(front, back);

        // Assert
        expect(results).to.eql(expected);
    });
});
