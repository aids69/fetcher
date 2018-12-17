'use strict';
const fs = require('fs');
const vk = require('vk-call');

const dbApi = require('./dbApi');

const keys = JSON.parse(fs.readFileSync('./data/keys.json'));
const token = keys.accessToken;

const api = new vk.VK({
    token,
    access_token: token,
    timeout: 10000
});

const fields = [
    'id',
    'verified', 'sex', 'bdate', 'city', 'country', 'home_town',
    'has_photo', 'online', 'domain', 'has_mobile',
    'contacts', 'site', 'education', 'universities', 'schools',
    'status', 'last_seen', 'followers_count', 'occupation',
    'nickname', 'relatives', 'relation', 'personal', 'connections',
    'exports', 'activities', 'interests', 'music', 'movies',
    'tv', 'books', 'games', 'about', 'quotes', 'screen_name',
    'timezone', 'maiden_name', 'career', 'military'
];

async function findById(id) {
    try {
        let user = await api.call('users.get', { user_ids: [id], fields });
        user = user[0];
        const groups = await api.call('groups.get', { user_id: id, count: 1000 });
        await dbApi.put(user);
        if (groups && groups.items) {
            dbApi.addGroups(id, JSON.stringify(groups.items.join(',')));
        }
        console.info('Found:', user.first_name, user.last_name);
    } catch (e) {
        console.info(e);
    }
}

const id_from_cmd = process.argv[2];
console.info('Searching for person with id:', id_from_cmd);
findById(id_from_cmd);
