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

// iterate through ids without friends, get friends of them (if profile is not private)
// put friend ids into db, for each friend id
// if its from Sverdlovsk region - we try to put it into db
async function bfs(start, amount) {
    const allNotVisitedIds = await dbApi.getIdsWithoutFriends();
    const ids = allNotVisitedIds.slice(start, start + amount);

    for (let i = 0; i < ids.length; i++) {
        const currentId = ids[i];
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
                    console.info('is from Sverdlovsk region');
                    await dbApi.put(friend);
                }
            }
        } catch (e) {
            console.info(e.message);
        }
    }
}

// we need a starting point and amount of people
bfs(0, 10);
