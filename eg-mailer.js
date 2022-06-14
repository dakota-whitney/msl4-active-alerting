const EdgeGrid = require('akamai-edgegrid');
const axios = require('axios');
//const { clientToken, clientSecret, accessToken, baseUri, cpCodes } = require('./eg-config.json');
const { clientToken, clientSecret, accessToken, baseUri, cpCodes } = require(process.env.egConfig);

const eg = new EdgeGrid(clientToken, clientSecret, accessToken, baseUri);

const today = new Date();
const yesterday = new Date()
yesterday.setDate(today.getDate() - 1);

const requestMinutes = (cpCode,market) => new Promise((resolve,reject) => {
    const todayEncoded = encodeURIComponent(today.toLocaleDateString());
    const yesterdayEncoded = encodeURIComponent(yesterday.toLocaleDateString());
    eg.auth({
        path: `https://${baseUri}/media-reports/v1/media-services-live/http-ingest/data?cpcodes=${cpCode}&dimensions=5002&metrics=5003&endDate=${todayEncoded}&startDate=${yesterdayEncoded}&offset=0&limit=30`,
        method: 'GET',
        headers:{}
    });
    eg.send((err,res,body) => {
        if(err || !body || res.status !== 200) return reject(err ? err.message : "Request failed");
        const { aggregate:minutes } = JSON.parse(body).columns[1];
        resolve(`${market} has used ${minutes} minutes`);
    });
});



const egRequests = Object.entries(cpCodes).map(([cpCode,market],i) => {
    if(i < 20) return requestMinutes(cpCode,market);
    else return new Promise((resolve,reject) => {
        const delay = (Math.floor(i / 20)) * 60000;
        setTimeout(() => requestMinutes(cpCode,market).then(minutes => resolve(minutes)).catch(e => reject(e)),delay)
    });
});

let output = "";

Promise.allSettled(egRequests).then(results => results.forEach((result,i,{length}) => {
    if(result.value) output = output.concat(`${result.value}\n`);
    if(i < length - 1) return;
    console.log(output);
    axios.post("https://script.google.com/macros/s/AKfycbz6bTaLenBJb_xq25MeJdSVorTdjFpDZr9lmQTU-ITH87_G6hKvXbrv-SYXg9wmNCEy/exec",output);
}));