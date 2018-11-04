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
dbApi.createTable();

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

const cities = JSON.parse(fs.readFileSync('./data/cities.json')).map(city => city.id);

async function findUser(id) {
    const user = await api.call('users.get', { user_ids: id, fields });
    return user;
}

function checkRegion(user) {
    return user.city && user.city.id && cities.includes(user.city.id);
}

function timeout(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// take first id from queue, get friends of this person(if profile is not private)
// put friend ids into db, for each friend id if we didnt visit it
// we get info from vk api, if its from Sverdlovsk region - we put it into db
// and append id to queue
async function bfs(part) {
    const allIds = await dbApi.getAllIds();
    let queue = [];
    if (part === 0) {
        queue = allIds.slice(0, 1850);
    } else if (part === 1) {
        queue = allIds.slice(1850, 3700);
    } else if (part === 2) {
        queue = allIds.slice(3700);
    } else {
        // so we all won't take third part
        throw('You\'re an idiot sandwich. Specify id');
    }
    let currentId = queue.shift();    

    while (queue.length) {
        try {
            const res = await Promise.all([api.call('friends.get', { user_id: currentId }), timeout(300)]);
            const friendsIds = res[0] ? res[0].items : [];

            await dbApi.addFriends(currentId, JSON.stringify(friendsIds.join(',')));
            for (let friendId of friendsIds) {
                const response = await Promise.all([
                    api.call('users.get', { user_ids: friendId, fields }),
                    timeout(350)
                ]);
                const friend = response[0] ? response[0][0] : {};
                console.info(friend.id);
                const isFromSverdlovskReg = checkRegion(friend);
                if (isFromSverdlovskReg) {
                    console.info('adding');
                    await dbApi.put(friend);
                    queue.push(friendId);
                }
            }
        } catch (e) {
            console.info(e.message);
        }
        currentId = queue.shift();
    }
}

// we need a starting point 0, 1850 and 3700
// so method just takes an int from 0 to 2 and determines part
// we are searching in
bfs(0);


