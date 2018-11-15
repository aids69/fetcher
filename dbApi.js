'use strict';

const { usersSchema } = require('./db/schema');
const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./db/users.db');

function _attachSubFields(keys, values, subFields, field, person) {
    subFields.forEach(subField => {
        keys.push(`${field}_${subField}`);
        // for arrays langs: []
        if (subField === 'langs') {
            values.push(person[field][subField].join(','));
        } else {
            values.push(person[field][subField]);
        }
    });
}

function _printEntry(entry) {
    Object.keys(entry).forEach(key => {
        if (entry[key] !== null) {
            console.info(`${key}: ${entry[key]}`);
        }
    })
}

module.exports = {
    // obj
    put: function (person) {
        const objectFields = ['city', 'country', 'last_seen',
            'occupation', 'personal', 'relation_partner', 'status_audio'];
        const arrayFields = ['career', 'military', 'relatives', 'schools', 'universities'];
        const keys = [];
        const values = [];

        Object.keys(person).forEach(field => {
            // for { ... "city": { "id": 1, "name": "a" }...}
            if (objectFields.includes(field)) {
                const subFields = Object.keys(person[field]);
                _attachSubFields(keys, values, subFields, field, person);
                // for career: [{},{},{}]
            } else if (arrayFields.includes(field)) {
                // adding everything in the end of first object with str concatination
                const combined = person[field].reduce((acc, current) => {
                    Object.keys(current).forEach(key => {
                        // if theres no such key in accumulator we set it, otherwise concat
                        acc[key] = acc[key] ? `${acc[key]},${current[key]}` : current[key];
                    });
                    return acc;
                }, {});
                // because we do not mutate person obj when adding values in arr elements
                const personProp = {};
                personProp[field] = combined;
                _attachSubFields(keys, values, Object.keys(combined), field, personProp);
                // for { "id": 1 } - basic case      
            } else {
                keys.push(field);
                values.push(person[field]);
            }
        });
        for (let i = 0; i < values.length; i++) {
            if (typeof values[i] === 'string') {
                // g is for replacing all quotes, sqlite needs another quote for escaping
                // instead of backslash
                values[i] = values[i].replace(/\'/g, '\'\'');
                values[i] = values[i].replace(/"/g, '""');
            }
        };

        const keysStr = keys.join(', ');
        // slice is for [ and ] and replace removes escaping backslashes
        let valuesStr = JSON.stringify(values).slice(1, -1).replace(/\\"/g, '"').replace(/\\'/g, '\'');
        return new Promise((res, rej) => {
            db.run(`INSERT OR IGNORE INTO users(${keysStr}) VALUES(${valuesStr})`, [], err => {
                err ? rej(err) : res();
            });
        });
    },

    dropTable: function (tableName = 'users') {
        return new Promise((res, rej) => {
            db.run(`DROP TABLE IF EXISTS ${tableName}`, [], err => {
                err ? rej() : res();
            });
        });
    },

    createTable: function (tableName = 'users', schema = usersSchema) {
        return new Promise((res, rej) => {
            db.run(`CREATE TABLE IF NOT EXISTS ${tableName} (${schema})`, [], err => {
                err ? rej(err) : res();
            });
        });
    },

    getById: function (id, tableName = 'users') {
        return new Promise((res, rej) => {
            db.all(`SELECT * FROM ${tableName} WHERE id=${id}`, (err, rows) => {
                err || !rows.length ? res({}) : res(rows[0]);
            });
        });
    },

    getAll: function (tableName = 'users') {
        return new Promise((res, rej) => {
            db.all(`SELECT * FROM ${tableName}`, (err, rows) => {
                err ? res([]) : res(rows);
            });
        });
    },

    getAllIds: function (tableName = 'users') {
        return new Promise((res, rej) => {
            db.all(`SELECT id FROM ${tableName}`, (err, rows) => {
                err ? res([]) : res(rows.map(el => el.id));
            });
        });
    },

    contains: function (id, tableName = 'users') {
        return module.exports.getById(id).then(entry => !!Object.keys(entry).length);
    },

    addFriends: function (id, friends, tableName = 'users') {
        return new Promise((res, rej) => {
            db.run(`UPDATE ${tableName} SET friends = ${friends} WHERE id = ${id}`, [], err => {
                err ? rej(err) : res();
            });
        });
    },

    addGroups: function (id, groups, tableName = 'users') {
        return new Promise((res, rej) => {
            db.run(`UPDATE ${tableName} SET communities = ${groups} WHERE id = ${id}`, [], err => {
                err ? rej(err) : res();
            });
        });
    },

    getIdsWithoutFriends: function (tableName = 'users') {
        return new Promise((res, rej) => {
            db.all(`SELECT id FROM ${tableName} WHERE friends IS NULL`, (err, rows) => {
                err ? res([]) : res(rows.map(el => el.id));
            });
        });
    },

    getIdsWithoutGroups: function (tableName = 'users') {
        return new Promise((res, rej) => {
            db.all(`SELECT id FROM ${tableName} WHERE communities IS NULL`, (err, rows) => {
                err ? res([]) : res(rows.map(el => el.id));
            });
        });
    },

    putGroup: function (group) {
        const keys = [
            'id', 'name', 'screen_name', 'is_closed', 'type', 'members_count',
            'verified', 'activity', 'age_limits', 'description', 'status', 'trending'
        ];

        const values = [];
        keys.forEach(key => {
            let current = group[key];
            if (typeof current === 'string') {
                current  = current.replace(/\"/g, '""')
            }
            values.push(current);
        });

        let valuesStr = JSON.stringify(values).slice(1, -1).replace(/\\"/g, '"').replace(/\\'/g, '\'');
        valuesStr = valuesStr.replace(/\\n/g, ' ');

        return new Promise((res, rej) => {
            db.run(`INSERT OR IGNORE INTO groups(${keys.join(', ')}) VALUES(${valuesStr})`, [], err => {
                err ? rej(err) : res();
            });
        });
    },

    prettyPrintById: function (id, tableName = 'users') {
        module.exports.getById(id).then(res => {
            _printEntry(res);
        });
    },

    prettyPrintAll: function (tableName = 'users') {
        module.exports.getAll().then(res => {
            res.forEach(entry => {
                console.info();
                _printEntry(entry);
            });
        });
    }
}
