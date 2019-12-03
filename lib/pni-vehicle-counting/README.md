# pni-vehicle-counting

This module contains the PlacePod vehicle counting algorithm.

This algorithm must maintain state between events and it is up to the caller to provide the most up to date state of the lane.
The module will output updated states when they are calculated.

## Structure

- index.js -> Outer wrapper which manages all of the individual calculations in progress

- Service.js -> Manages calculations for a single lane. This looks at the state of the lane and deternimes when Algorithm.js should be called.

- Algorithm.js -> Core vehicle counting algorithm to compute a change in total count.
