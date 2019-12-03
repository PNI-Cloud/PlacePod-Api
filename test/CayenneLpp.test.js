/* eslint-env mocha */

'use strict';

/* Imports */
const { decoder } = require('cayenne-lpp');
const { expect } = require('chai');

describe('cayenne-lpp unit tests.', () => {
    [
        {
            name: 'car presence',
            payload: '156601',
            expected: [{ presence_21: 1 }],
        },
        {
            name: 'double car presence',
            payload: '156601156600',
            expected: [{ presence_21: 1 }, { presence_21: 0 }],
        },
        {
            name: 'car counter',
            payload: '21001F',
            expected: [{ digital_input_33: 31 }],
        },
        {
            name: 'double car counter',
            payload: '21001F210020',
            expected: [{ digital_input_33: 31 }, { digital_input_33: 32 }],
        },
        {
            name: 'temperature and battery',
            payload: '0302016D026700EB',
            expected: [{ analog_input_3: 3.65 }, { temperature_2: 23.5 }],
        },
        {
            name: 'car presence with temperature and battery',
            payload: '0302016D026700EB156601',
            expected: [{ analog_input_3: 3.65 }, { temperature_2: 23.5 }, { presence_21: 1 }],
        },
        {
            name: 'car counter with temperature and battery',
            payload: '0302016D026700EB210080',
            expected: [
                { analog_input_3: 3.65 }, { temperature_2: 23.5 }, { digital_input_33: 128 },
            ],
        },
        {
            name: 'car presence keep alive',
            payload: '376601',
            expected: [{ presence_55: 1 }],
        },
        {
            name: 'car counter keep alive',
            payload: '21001F',
            expected: [{ digital_input_33: 31 }],
        },
        {
            name: 'sensor error',
            payload: '050006060003',
            expected: [{ digital_input_5: 6 }, { digital_input_6: 3 }],
        },
    ].forEach((run) => {
        it(`decoder.decode(), ${run.name}, returns expected result.`, () => {
            // Arrange
            const input = Buffer.from(run.payload, 'hex');

            // Act
            const results = decoder.decode(input);

            // Assert
            expect(results).to.eql(run.expected);
        });
    });
});
