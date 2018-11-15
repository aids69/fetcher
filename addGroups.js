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

const { communitiesSchema } = require('./db/schema');
dbApi.createTable();
dbApi.createTable('groups', communitiesSchema);

const fields = [
    'members_count', 'verified', 'activity',
    'age_limits', 'description', 'status', 'trending'
];

function timeout(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// put into new table and update record in old with ids array
async function addCommunities(start, amount) {
    const allNotVisitedIds = await dbApi.getIdsWithoutGroups();
    const ids = allNotVisitedIds.slice(start, start + amount);
    console.info(ids);

    for (let i = 0; i < ids.length; i++) {
        const currentId = ids[i];
        try {
            const res = await Promise.all([
                api.call('groups.get', { user_id: currentId, extended: 1, fields }),
                timeout(300)
            ]);

            const groups = res[0] ? res[0].items : [];
            const groupsIds = groups.map(group => group.id);
            await dbApi.addGroups(currentId, JSON.stringify(groupsIds.join(',')));
            
            for (let i = 0; i < groups.length; i++) {
                await dbApi.putGroup(groups[i]);
            }

        } catch (e) {
            await dbApi.addGroups(currentId, JSON.stringify('-'));
            
            console.info(e.message);
        }
    }
}

// we need a starting point and amount of people
addCommunities(0, 1);
