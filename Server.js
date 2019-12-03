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
const App = require('./App');
const ScopeManager = require('./lib/ScopeManager');
const Database = require('./database');
const { ClientController } = require('./controllers/v1');

/**
 * Main entry point. */
(async () => {
    // Initialize any outside dependencies such as databases.
    await Database.startup();

    // Use this for creating an initial user.
    if (process.env.CREATE_ADMIN && process.env.ADMIN_NAME && process.env.ADMIN_EMAIL) {
        try {
            const result = await ClientController.create({
                id: process.env.ADMIN_NAME,
                scope: ScopeManager.scopes.admin,
                email: process.env.ADMIN_EMAIL,
            });
            console.log('Admin user: ', result);
        } catch (ex) {
            console.error('Problem creating Admin user: ', ex);
        }
    }

    // Start up the express app that hosts the API.
    try {
        const port = process.env.PORT || 3000;
        App.listen(port, () => {
            console.log(`Listening on port ${port}...`);
        });
    } catch (ex) {
        console.error(ex);
    }
})();
