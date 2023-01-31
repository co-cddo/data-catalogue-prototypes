//
// For guidance on how to create routes see:
// https://prototype-kit.service.gov.uk/docs/create-routes
//

const govukPrototypeKit = require('govuk-prototype-kit')
const router = govukPrototypeKit.requests.setupRouter()
const { promises: fs } = require("fs");
let itemsjs;
let items;

let global = {};

const init =  async function() {
   global.organisations = await helpers.getData('./app/data/organisations.json');
   global.topics = await helpers.getData('./app/data/topics.json');
   let resources = [];
   const catalogue = await helpers.getData('./app/data/catalogue.json');
   const mappedCatalogue = helpers.mapLiveSchemaToSpec(catalogue);
   const nhs = await helpers.getData('./app/data/nhs.json');
   const mappedNhs = helpers.mapLiveSchemaToSpec(nhs.apis, 'nhs-digital', 'health');
   resources = resources.concat(mappedNhs, mappedCatalogue);

   const index = searchSetup(resources);
   
   // SPRINT 1 ROUTES
   router.get('/s1/find', function(req, res) {  
    let items = resources;  
    let searchTerm;
    let appliedFilters = {};
    if (Object.keys(req.query).length !== 0) {
        if(req.query.q) {
            searchTerm = req.query.q;
        }
        if(Array.isArray(req.query.organisationFilters)) {
            appliedFilters.issuing_body = req.query.organisationFilters.filter(function(e) {
                if(e == '_unchecked') {
                    return false;
                }
                return true;
            })
        }
        if(Array.isArray(req.query.topicFilters)) {
            appliedFilters.topic = req.query.topicFilters.filter(function(e) {
                if(e == '_unchecked') {
                    return false;
                }
                return true;
            })
        }
        const results = search(searchTerm, appliedFilters);
        items = results.data.items;
    }

    const filters = [
        {
            title: 'Topics',
            id: 'topicFilters',
            items: helpers.generateFilterItems(global.topics, 'id', 'name', 'topicFilters', req),
        },
        {
            title: 'Organisations',
            id: 'organisationFilters',
            items: helpers.generateFilterItems(global.organisations, 'id', 'name', 'organisationFilters', req),
        }
    ]
    
    const count = items.length;
    res.render("s1/find", { resources: items, count: count, query: searchTerm, filters: filters });
   })
}

const searchSetup = function(data) {
    const configuration = {
        sortings: {
            name_dsc: {
            field: 'title',
            order: 'dsc'
            }
        },
        aggregations: {
            issuing_body: {
                title: 'Organisations',
                size: 30,
                conjunction: false
            },
            topic: {
                title: 'Topics',
                size: 30,
                conjunction: false
            }
        },
        searchableFields: ['title', 'description' ,'issuing_body_readable'],
    };
    itemsjs = require('itemsjs')(data, configuration);
    return itemsjs.search();
}

const search = function(query, filters) {
    const results = itemsjs.search({
        per_page: 1000,
        sort: 'name_dsc',
        query: query,
        filters: filters
    });
    // console.log(JSON.stringify(results, null, 2));
    
    return results;
}

const helpers = {
    async getData(path) {
        try {
            const data = await fs.readFile(path, "utf-8");
            return JSON.parse(data);
    
        } catch (error) {
            console.log("e", error);
        }
    },
    mapLiveSchemaToSpec(data, issuing_body, topic) {
        return data.map(function(e) {
            let n = {};
            if(e.data) {
                n.title = e.data.name;
                n.description = e.data.description;
                n.issuing_body_readable = e.data.organisation;
                n.issuing_body = issuing_body;
                n.topic = helpers.generateTopics(topic);
            }
            else {
                n.title = e.name;
                n.description = e.description;
                n.issuing_body = e.provider;
                n.issuing_body_readable = helpers.getOrgTitle(e.provider);
                n.topic = helpers.generateTopics(e.topic);
            }
            return n;
        }
        )
    },
    generateTopics(string) {
        const topics = [].concat(string.split(','));
        return topics.map(function(e) {
            const newTopics = global.topics.find(element => element.id == e);
            return newTopics;
        });

    },
    generateFilterItems(items, valueKey, textKey, groupId, req) {
        const query = req.query;
        return items.map(function(e) {
            let n = {};
            n.value = e[valueKey];
            n.text = e[textKey];
            n.name = groupId;
            if(query && query[groupId] && query[groupId].includes(n.value)) {
                n.checked = 'checked'
            }
            return n;
        });
    },
    getOrgTitle(id) {
        let name;
        for (let i = 0; i < global.organisations.length; i++) {
            if (global.organisations[i]['id'] == id) {
                name = global.organisations[i]['name'];
                break;
            }
        }
        return name;
    }
}

init();
