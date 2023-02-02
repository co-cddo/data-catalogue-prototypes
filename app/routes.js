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
   global.resources = [];
   const catalogue = await helpers.getData('./app/data/catalogue.json');
   const mappedCatalogue = helpers.mapLiveSchemaToSpec(catalogue);
   const nhs = await helpers.getData('./app/data/nhs.json');
   const mappedNhs = await helpers.mapLiveSchemaToSpec(nhs.apis, 'nhs-digital', 'health');
   global.resources =  await global.resources.concat(mappedNhs, mappedCatalogue);

   global.index = searchSetup(global.resources);
    //    console.log(JSON.stringify(resources, 0, 2));
    //    console.log(JSON.stringify(global.index.data.items, 0, 2));
}

// SPRINT 1 ROUTES
router.get('/s1/find', function(req, res) {  
    let items = global.resources;  
    let searchTerm;
    let appliedFilters = {};
    let aggregations = global.index.data.aggregations;
    let anyFiltersActive = false;
    if (Object.keys(req.query).length !== 0) {
        if(req.query.q) {
            searchTerm = req.query.q;
        }
        if(Array.isArray(req.query.organisationFilters)) {
            anyFiltersActive = true;
            appliedFilters.issuing_body = req.query.organisationFilters.filter(function(e) {
                if(e == '_unchecked') {
                    return false;
                }
                return true;
            })
        }
        if(Array.isArray(req.query.topicFilters)) {
            appliedFilters.topic = req.query.topicFilters.filter(function(e) {
                anyFiltersActive = true;
                if(e == '_unchecked') {
                    return false;
                }
                return true;
            })
        }
        const results = search(searchTerm, appliedFilters);
        items = results.data.items;
        aggregations = results.data.aggregations;
    }
    
    const filters = [
        {
            title: 'Topics',
            id: 'topicFilters',
            items: helpers.generateFilterItems(global.topics, 'id', 'name', 'topicFilters', aggregations.topic),
        },
        {
            title: 'Organisations',
            id: 'organisationFilters',
            items: helpers.generateFilterItems(global.organisations, 'id', 'name', 'organisationFilters', aggregations.issuing_body),
        }
    ]
    
    const count = items.length;
    items = helpers.enrichTopics(items);
    // console.log(JSON.stringify(items, 0, 2));
    req.session.current_url = req.originalUrl;
    res.render("s1/find", { resources: items, count: count, query: searchTerm, filters: filters, anyFiltersActive: anyFiltersActive });
})

router.get('/s1/resources/:resourceID', function(req, res) {
    const resource = global.resources.find(r => r.slug ==  req.params.resourceID);
    let backLink = (req.session.current_url === undefined || req.session.current_url.startsWith('/s1/resource')) ? '/s1/find' : req.session.current_url;
    req.session.current_url = req.originalUrl;
    res.render("s1/resource", { resource: resource, backLink: backLink });
})


const searchSetup = function(data) {
    const configuration = {
        sortings: {
            name_dsc: {
            field: 'title',
            order: 'dsc'
            }
        },
        aggregations: {
            topic: {
                title: 'Topics',
                size: 30,
                conjunction: false
            },
            issuing_body: {
                title: 'Organisations',
                size: 30,
                conjunction: false
            },
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
                n.topic = helpers.splitTopics(topic);
            }
            else {
                n.title = e.name;
                n.description = e.description;
                n.issuing_body = e.provider;
                n.issuing_body_readable = helpers.getOrgTitle(e.provider);
                if(e.topic) {
                    n.topic = helpers.splitTopics(e.topic);
                }
            }
            n.slug = n.title.toLowerCase().replaceAll(' ','-');
            return n;
        }
        )
    },
    splitTopics(string) {
        const topics = [].concat(string.split(','));
        return topics.map(function(e) {
            const newTopic = global.topics.find(element => element.id == e);
            try {
                newTopic.id;
            } catch (e) {
                console.error('Topic does not match one of the pre-defined topics:' + e);
            }
            if(newTopic) {
                return newTopic.id;
            }
            return "";
        });
    },
    enrichTopics(items) {
        items.forEach(function(item, index) {
            if(typeof item.topic == 'undefined') {
                return;
            }
            const topics = item.topic.map(function(e) {
                if(typeof e == 'object') {
                    return e;
                }
                const newTopic = global.topics.find(topic => topic.id == e);
                return newTopic;
            });
            items[index].topic = topics;
        });
        return items;
    },
    generateFilterItems(items, valueKey, textKey, groupId, aggregation) {
        return aggregation.buckets.map(function(e) {
            const ogFilterItem = items.find(item => item[valueKey] == e.key);
            try {
                ogFilterItem[valueKey];
            } catch (e) {
                console.error('Filter does not match one of the pre-defined options:' + e);
            }
            let n = {};
            n.value = ogFilterItem[valueKey];
            n.text = ogFilterItem[textKey];
            n.name = groupId;
            if(e.selected) {
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
