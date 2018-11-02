'use strict';
const fs = require('fs');

const dbApi = require('./dbApi');
// dbApi.dropTable();
dbApi.createTable();
const oldData = JSON.parse(fs.readFileSync('./data/data_valid.json'));
async function saveData(arr) {
    for (let i = 0; i < arr.length; i++) {
        delete arr[i].friends;
        delete arr[i].groups;
        await dbApi.put(arr[i]);
    }
}

saveData(oldData);
