//
// For guidance on how to create routes see:
// https://prototype-kit.service.gov.uk/docs/create-routes
//

const govukPrototypeKit = require('govuk-prototype-kit')
const router = govukPrototypeKit.requests.setupRouter()
const { promises: fs } = require("fs");
const got = require('got');
let cache = {};
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
}

// SPRINT 1 ROUTES
let sprint = 's1';
router.get('/' + sprint + '/start', async function(req,res) {
    sprint = 's1';
    let topics =  global.index.data.aggregations.topic.buckets;
    topics = topics.map(function(e) {
        const newTopic = global.topics.find(topic => topic.id == e.key);
        newTopic.count = e.doc_count;
        return newTopic;
    });
    const orgs = await helpers.enrichOrgs(global.organisations);
    const endpbs = orgs.filter( org => org.format == 'Executive non-departmental public body');
    const mds = orgs.filter( org => org.format == 'Ministerial department');
    const nmds = orgs.filter( org => org.format == 'Non-ministerial department');
    const ea = orgs.filter( org => org.format == 'Executive agency');
    const so = orgs.filter( org => org.format == 'Sub organisation');
    const pc = orgs.filter( org => org.format == 'Public corporation');
    const others = [].concat(so, pc, orgs.filter( org => typeof org.format == 'undefined')); 
    res.render(sprint + "/start", { sprint: sprint, topics: topics, organisations: orgs, endpbs: endpbs, mds: mds, nmds: nmds, ea: ea, so: so, pc: pc, others: others });
})
router.get('/' + sprint + '/find', function(req, res) {  
    sprint = 's1';
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
            items: helpers.generateFilterItems(global.topics, 'id', 'name', 'topicFilters', aggregations.topic)
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
    res.render(sprint + "/find", { sprint: sprint, resources: items, count: count, query: searchTerm, filters: filters, anyFiltersActive: anyFiltersActive });
})

router.get('/' + sprint + '/resources/:resourceID', function(req, res) {
    sprint = 's1';
    let resource = global.resources.find(r => r.slug ==  req.params.resourceID);
    resource.topic = helpers.enrichTopic(resource.topic);
    let backLink = (req.session.current_url === undefined || req.session.current_url.startsWith('/s1/resource')) ? '/s1/find' : req.session.current_url;
    req.session.current_url = req.originalUrl;
    res.render(sprint +  "/resource", { sprint: sprint, resource: resource, backLink: backLink });
})

// SPRINT 2 ROUTES
sprint = 's2';
router.get('/' + sprint +  '/start', async function(req,res) {
    sprint = 's2';
    let topics =  global.index.data.aggregations.topic.buckets;
    topics = topics.map(function(e) {
        const newTopic = global.topics.find(topic => topic.id == e.key);
        newTopic.count = e.doc_count;
        return newTopic;
    });
    const orgs = await helpers.enrichOrgs(global.organisations);
    const endpbs = orgs.filter( org => org.format == 'Executive non-departmental public body');
    const mds = orgs.filter( org => org.format == 'Ministerial department');
    const nmds = orgs.filter( org => org.format == 'Non-ministerial department');
    const ea = orgs.filter( org => org.format == 'Executive agency');
    const so = orgs.filter( org => org.format == 'Sub organisation');
    const pc = orgs.filter( org => org.format == 'Public corporation');
    const others = [].concat(so, pc, orgs.filter( org => typeof org.format == 'undefined')); 
    res.render("s2/start", { sprint: sprint, topics: topics, organisations: orgs, endpbs: endpbs, mds: mds, nmds: nmds, ea: ea, so: so, pc: pc, others: others });
})
router.get('/' + sprint + '/find', function(req, res) {  
    sprint = 's2';
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
                if(e == '_unchecked' || e == req.query.removeFilter) {
                    return false;
                }
                return true;
            })
        }
        if(Array.isArray(req.query.topicFilters)) {
            appliedFilters.topic = req.query.topicFilters.filter(function(e) {
                anyFiltersActive = true;
                if(e == '_unchecked' || e == req.query.removeFilter) {
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
            expanded: 'true',
            selectedCount: helpers.getSelectedFiltersCount(aggregations.topic.buckets)
        },
        {
            title: 'Organisations',
            id: 'organisationFilters',
            items: helpers.generateFilterItems(global.organisations, 'id', 'name', 'organisationFilters', aggregations.issuing_body),
            expanded: 'true',
            selectedCount: helpers.getSelectedFiltersCount(aggregations.issuing_body.buckets)
        }
    ]
    // console.log(JSON.stringify(filters, 0, 2));
    const count = items.length;
    items = helpers.enrichTopics(items);
    const clearlinkUrl = req.path + '?q=' + req.query.q;
    const selectedFilters = helpers.getSelectedFilters(filters, req.url, clearlinkUrl);
    req.session.current_url = req.originalUrl;
    res.render(sprint + "/find", { sprint: sprint, resources: items, selectedFilters: selectedFilters, count: count, query: searchTerm, filters: filters, anyFiltersActive: anyFiltersActive, clearlinkUrl: clearlinkUrl });
})
router.get('/' + sprint + '/resources/:resourceID', function(req, res) {
    sprint = 's2';
    let resource = global.resources.find(r => r.slug ==  req.params.resourceID);
    resource.topic = helpers.enrichTopic(resource.topic);
    let backLink = (req.session.current_url === undefined || req.session.current_url.startsWith('/s2/resource')) ? '/s1/find' : req.session.current_url;
    req.session.current_url = req.originalUrl;
    res.render(sprint + "/resource", { sprint: sprint, resource: resource, backLink: backLink });
})

// SPRINT 3 ROUTES
sprint = 's3';
router.get('/' + sprint +  '/start', async function(req,res) {
    sprint = 's3';
    let topics =  global.index.data.aggregations.topic.buckets;
    topics = topics.map(function(e) {
        const newTopic = global.topics.find(topic => topic.id == e.key);
        newTopic.count = e.doc_count;
        return newTopic;
    });
    res.render(sprint + "/start", { sprint: 's3', topics: topics });
})

// SPRINT 4
// A search results page with pagination
sprint = 's4';
router.get('/' + sprint + '/find', function(req, res) {  
    sprint = 's4';
    const paginationPerPage = 30;
    let items = global.resources;  
    let searchTerm;
    let appliedFilters = {};
    let aggregations = global.index.data.aggregations;
    let anyFiltersActive = false;
    let page = '1';
    if (Object.keys(req.query).length !== 0) {
        if(req.query.q) {
            searchTerm = req.query.q;
        }
        page = (typeof req.query.page === 'undefined') ? '1' : req.query.page;
        if(Array.isArray(req.query.organisationFilters)) {
            anyFiltersActive = true;
            appliedFilters.issuing_body = req.query.organisationFilters.filter(function(e) {
                if(e == '_unchecked' || e == req.query.removeFilter) {
                    return false;
                }
                return true;
            })
        }
        if(Array.isArray(req.query.topicFilters)) {
            appliedFilters.topic = req.query.topicFilters.filter(function(e) {
                anyFiltersActive = true;
                if(e == '_unchecked' || e == req.query.removeFilter) {
                    return false;
                }
                return true;
            })
        }
    }
    const results = s4Search(searchTerm, appliedFilters, paginationPerPage, page);
    // console.log(JSON.stringify(results, 0, 2));
    items = results.data.items;
    aggregations = results.data.aggregations;
    
    const filters = [
        {
            title: 'Topics',
            id: 'topicFilters',
            items: helpers.generateFilterItems(global.topics, 'id', 'name', 'topicFilters', aggregations.topic),
            expanded: 'true',
            selectedCount: helpers.getSelectedFiltersCount(aggregations.topic.buckets)
        },
        {
            title: 'Organisations',
            id: 'organisationFilters',
            items: helpers.generateFilterItems(global.organisations, 'id', 'name', 'organisationFilters', aggregations.issuing_body),
            expanded: 'true',
            selectedCount: helpers.getSelectedFiltersCount(aggregations.issuing_body.buckets)
        }
    ]
    console.log(JSON.stringify(req.query, null, 2));
    const pagination = results.pagination;
    pagination.from = ((pagination.page -1) * pagination.per_page) +1;
    pagination.to = pagination.page * pagination.per_page;
    pagination.to = (pagination.total <= pagination.to) ? pagination.total : pagination.to;
    pagination.numPages = Math.ceil(pagination.total / pagination.per_page);
    console.log(JSON.stringify(req.originalUrl, null, 2));
    pagination.items = helpers.getPaginationItems(pagination, req);
    pagination.next = helpers.getPaginationNext(pagination, req);
    pagination.previous = helpers.getPaginationPrev(pagination, req);
    // console.log(JSON.stringify(pagination, null, 2));
    items = helpers.enrichTopics(items);
    const clearlinkUrl = helpers.getClearFiltersUrl(req);
    const selectedFilters = helpers.getSelectedFilters(filters, req.url, clearlinkUrl);
    req.session.current_url = req.originalUrl;
    res.render(sprint + "/find", { sprint: sprint, pagination: results.pagination, resources: items, selectedFilters: selectedFilters, count: pagination.total, query: searchTerm, filters: filters, anyFiltersActive: anyFiltersActive, clearlinkUrl: clearlinkUrl, thisUrl: req.baseUrl + req.path });
})


// SPRINT 4
// A search results page that handles long descriptions gracefully
sprint = 's4';
router.get('/' + sprint + '/find-3', function(req, res) {  
    sprint = 's4';
    const paginationPerPage = 30;
    let items = global.resources;  
    let searchTerm;
    let appliedFilters = {};
    let aggregations = global.index.data.aggregations;
    let anyFiltersActive = false;
    let page = '1';
    if (Object.keys(req.query).length !== 0) {
        if(req.query.q) {
            searchTerm = req.query.q;
        }
        page = (typeof req.query.page === 'undefined') ? '1' : req.query.page;
        if(Array.isArray(req.query.organisationFilters)) {
            anyFiltersActive = true;
            appliedFilters.issuing_body = req.query.organisationFilters.filter(function(e) {
                if(e == '_unchecked' || e == req.query.removeFilter) {
                    return false;
                }
                return true;
            })
        }
        if(Array.isArray(req.query.topicFilters)) {
            appliedFilters.topic = req.query.topicFilters.filter(function(e) {
                anyFiltersActive = true;
                if(e == '_unchecked' || e == req.query.removeFilter) {
                    return false;
                }
                return true;
            })
        }
    }
    const results = s4Search(searchTerm, appliedFilters, paginationPerPage, page);
    // console.log(JSON.stringify(results, 0, 2));
    items = results.data.items;
    aggregations = results.data.aggregations;
    
    const filters = [
        {
            title: 'Topics',
            id: 'topicFilters',
            items: helpers.generateFilterItems(global.topics, 'id', 'name', 'topicFilters', aggregations.topic),
            expanded: 'true',
            selectedCount: helpers.getSelectedFiltersCount(aggregations.topic.buckets)
        },
        {
            title: 'Organisations',
            id: 'organisationFilters',
            items: helpers.generateFilterItems(global.organisations, 'id', 'name', 'organisationFilters', aggregations.issuing_body),
            expanded: 'true',
            selectedCount: helpers.getSelectedFiltersCount(aggregations.issuing_body.buckets)
        }
    ]
    console.log(JSON.stringify(req.query, null, 2));
    const pagination = results.pagination;
    pagination.from = ((pagination.page -1) * pagination.per_page) +1;
    pagination.to = pagination.page * pagination.per_page;
    pagination.to = (pagination.total <= pagination.to) ? pagination.total : pagination.to;
    pagination.numPages = Math.ceil(pagination.total / pagination.per_page);
    console.log(JSON.stringify(req.originalUrl, null, 2));
    pagination.items = helpers.getPaginationItems(pagination, req);
    pagination.next = helpers.getPaginationNext(pagination, req);
    pagination.previous = helpers.getPaginationPrev(pagination, req);
    // console.log(JSON.stringify(pagination, null, 2));
    items = helpers.enrichTopics(items);
    const clearlinkUrl = helpers.getClearFiltersUrl(req);
    const selectedFilters = helpers.getSelectedFilters(filters, req.url, clearlinkUrl);
    req.session.current_url = req.originalUrl;
    res.render(sprint + "/find-3", { sprint: sprint, pagination: results.pagination, resources: items, selectedFilters: selectedFilters, count: pagination.total, query: searchTerm, filters: filters, anyFiltersActive: anyFiltersActive, clearlinkUrl: clearlinkUrl, thisUrl: req.baseUrl + req.path });
})

// SPRINT 4
// A search results page, containing only results with concise descriptions
router.get('/' + sprint + '/find-2', function(req, res) {  
    sprint = 's4';
    const paginationPerPage = 30;
    let items = global.resources;  
    let searchTerm;
    let appliedFilters = {};
    let aggregations = global.index.data.aggregations;
    let anyFiltersActive = false;
    let page = '1';
    if (Object.keys(req.query).length !== 0) {
        if(req.query.q) {
            searchTerm = req.query.q;
        }
        page = (typeof req.query.page === 'undefined') ? '1' : req.query.page;
        if(Array.isArray(req.query.organisationFilters)) {
            anyFiltersActive = true;
            appliedFilters.issuing_body = req.query.organisationFilters.filter(function(e) {
                if(e == '_unchecked' || e == req.query.removeFilter) {
                    return false;
                }
                return true;
            })
        }
        if(Array.isArray(req.query.topicFilters)) {
            appliedFilters.topic = req.query.topicFilters.filter(function(e) {
                anyFiltersActive = true;
                if(e == '_unchecked' || e == req.query.removeFilter) {
                    return false;
                }
                return true;
            })
        }
    }
    appliedFilters["Keep?"] = ['checked'];
    const results = s4Search(searchTerm, appliedFilters, paginationPerPage, page);
    items = results.data.items;
    items = helpers.betterDescriptions(items);
    // console.log(JSON.stringify(items, 0, 2));
    aggregations = results.data.aggregations;
    
    const filters = [
        {
            title: 'Topics',
            id: 'topicFilters',
            items: helpers.generateFilterItems(global.topics, 'id', 'name', 'topicFilters', aggregations.topic),
            expanded: 'true',
            selectedCount: helpers.getSelectedFiltersCount(aggregations.topic.buckets)
        },
        {
            title: 'Organisations',
            id: 'organisationFilters',
            items: helpers.generateFilterItems(global.organisations, 'id', 'name', 'organisationFilters', aggregations.issuing_body),
            expanded: 'true',
            selectedCount: helpers.getSelectedFiltersCount(aggregations.issuing_body.buckets)
        }
    ]
    const pagination = results.pagination;
    pagination.from = ((pagination.page -1) * pagination.per_page) +1;
    pagination.to = pagination.page * pagination.per_page;
    pagination.to = (pagination.total <= pagination.to) ? pagination.total : pagination.to;
    pagination.numPages = Math.ceil(pagination.total / pagination.per_page);
    pagination.items = helpers.getPaginationItems(pagination, req);
    pagination.next = helpers.getPaginationNext(pagination, req);
    pagination.previous = helpers.getPaginationPrev(pagination, req);
    items = helpers.enrichTopics(items);
    const clearlinkUrl = helpers.getClearFiltersUrl(req);
    const selectedFilters = helpers.getSelectedFilters(filters, req.url, clearlinkUrl);
    req.session.current_url = req.originalUrl;
    res.render(sprint + "/find-2", { sprint: sprint, pagination: results.pagination, resources: items, selectedFilters: selectedFilters, count: pagination.total, query: searchTerm, filters: filters, anyFiltersActive: anyFiltersActive, clearlinkUrl: clearlinkUrl, thisUrl: req.baseUrl + req.path });
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
            "Keep?": {
                title: 'Keep?',
                size: 30,
                conjunction: false
            }
        },
        searchableFields: ['title', 'description', 'better description', 'issuing_body_readable'],
    };
    itemsjs = require('itemsjs')(data, configuration);
    return itemsjs.search();
}


const s4Search = function(query, filters, perPage, page) {
    const results = itemsjs.search({
        per_page: perPage,
        page: page,
        sort: 'name_dsc',
        query: query,
        filters: filters
    });
    // console.log(JSON.stringify(results, null, 2));
    
    return results;
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
    getPaginationItems(pagination, req) {
        let manyPages = false;
        if(pagination.numPages > 6 ) {
            manyPages = true;
        }
        let url = new URL(helpers.getFullUrl(req));
        let items = [];
        for (let index = 1; index <= pagination.numPages; index++) {
            if(manyPages) {
                switch (index) {
                    case 1:
                        break;
                    case pagination.page:
                        break;
                    case pagination.page -1:
                        break;
                    case pagination.page +1:
                        break;
                    case pagination.numPages:
                        break;
                    default:
                        items.push({
                            ellipsis: true
                        })
                        continue;
                }
            }
            url.searchParams.set('page', index);
            const item = {
                "number": index,
                "href": url.href
            }
            if (index == pagination.page) {
                item.current = true;
            }
            items.push(item);
        }
        // Remove duplicate adjacent ellipsis
        items = items.filter((i,index) => {
            if(index == 0) {
                return true;
            }
            if(!i.ellipsis) {
                return true;
            }
            return items[index-1].ellipsis !== i.ellipsis;
        });
        return items;
    },
    getPaginationNext(pagination, req) {
        // If we're not on the last page, return a next link
        if(pagination.page != pagination.numPages) {
            const nextPage = pagination.page + 1;
            let url = new URL(helpers.getFullUrl(req));
            url.searchParams.set('page', nextPage);
            return {
                text: 'Next',
                href: url.href
            }
        }
    },
    getPaginationPrev(pagination, req) {
        // If we're not on the first page, return a previous link
        if(pagination.page != 1) {
            const prevPage = pagination.page - 1;
            let url = new URL(helpers.getFullUrl(req));
            url.searchParams.set('page', prevPage);
            return {
                text: 'Previous',
                href: url.href
            }
        }
    },
    getClearFiltersUrl(req) {
        let url = new URL(helpers.getFullUrl(req));
        url.searchParams.set('topicFilters', "_unchecked");
        url.searchParams.set('organisationFilters', "_unchecked");
        return url;
    },
    getFullUrl(req) {
        const url = req.protocol + '://' + req.get('host') + req.originalUrl
        return url;
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
                n.contact = e.data.contact;
                n.documentation = e.data['documentation-url'];
            }
            else {
                n.title = e.name;
                n.description = e.description;
                n.issuing_body = e.provider;
                n.issuing_body_readable = helpers.getOrgTitle(e.provider);
                n.contact = e.maintainer;
                n.documentation = e.documentation;
                if(e.topic) {
                    n.topic = helpers.splitTopics(e.topic);
                }
            }
            n.url = e.url;
            n.slug = n.title.toLowerCase().replaceAll(' ','-');
            n["Keep?"] = e["Keep?"];
            n['better description'] = e['better description'];
            return n;
        }
        )
    },
    betterDescriptions(data) {
        return data.map(function(e) {
            let n = e;
            n.description = (e['better description'] === '') ?  e['description']: e['better description'];
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
    enrichTopics(resources) {
        resources.forEach(function(resource, index) {
            resources[index].topic = helpers.enrichTopic(resource.topic);
        });
        return resources;
    },
    enrichTopic(topic) {
        if(typeof topic == 'undefined') {
            return;
        }
        const topics = topic.map(function(e) {
            if(typeof e == 'object') {
                return e;
            }
            const newTopic = global.topics.find(topic => topic.id == e);
            return newTopic;
        });
        return topics;
    },
    async enrichOrgs(orgs) {
        let promises = [];
        orgs.forEach(function(org) {
            const promise = 
            helpers.enrichOrg(org)
                .then((newOrg) => {
                    return newOrg;
                })
                .catch((err) => {
                    throw Error(err);
                });
            promises.push(promise);
        })
        return Promise.all(promises);
    },
    async enrichOrg(org) {
        const url = 'https://www.gov.uk/api/organisations/' + org.id;
        if(cache[url]) {
            return promise.then( () => cache[url]);
        }
        else {
            return got(url).json().then((data) => {
                org.format = data.format;
                org.details = data.details;
                return org;
            }).catch((error) => {
                console.error(error.code);
                return org;
            });
        }
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
    },
    getSelectedFilters(filters, currentUrl, clearlinkUrl) {
        let selectedFilters =  {
            heading: {
            text: 'Selected filters'
            },
            clearLink: {
            text: 'Clear filters',
            href: clearlinkUrl
            }
        };
        selectedFilters.categories =  filters.map(function(c) {
            let category = {};
            category.items = c.items.filter(function(item) {
                if(item.checked !== 'checked') {
                    return false;
                }
                else {
                    return true;
                }
            }).map(function(b) {
                const item = {
                    href: currentUrl + '&removeFilter=' + b.value,
                    text: b.text
                }
                return item;
            });
            category.heading = {
                text: c.title
            }

            return category;
        });
        selectedFilters.categories = selectedFilters.categories.filter(function(category) {
            if(category.items.length == 0) {
                return false;
            }
            return true;
        });
        if(selectedFilters.categories.length == 0){
            return false;
        }
        return selectedFilters;
    },
    getSelectedFiltersCount(items) {
        // console.log(items);
        const selectedItems = items.filter(function(item) {
             return item.selected;  
        });
        return selectedItems.length;
    }
}

init();
