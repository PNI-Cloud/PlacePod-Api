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
 * Defines available oauth2 scopes and how they relate to each other. */
class ScopeManager {
    constructor() {
        /**
         * The available OAuth2 scopes for this API.
         * @public */
        this.scopes = {
            /**
             * Can access everything */
            admin: 'admin',

            /**
             * Limited to base functionality. */
            user: 'user',
        };
    }

    /**
     * Make sure the provided scope is valid.
     * @param {string} scope : Value to check.
     */
    doesScopeExist(scope) {
        for (const key in this.scopes) {
            if (this.scopes[key] === scope) {
                return true;
            }
        }
        return false;
    }

    /**
     * Make sure the provided scope is at least the required scope. Admin always passes.
     * @param {string} scope : The scope to validate.
     * @param {string} requiredScope : The minimum required scope.
     */
    isScopeValid(scope, requiredScope) {
        if (scope === this.scopes.admin) {
            return true;
        }

        return (scope === requiredScope);
    }
}

module.exports = new ScopeManager();
