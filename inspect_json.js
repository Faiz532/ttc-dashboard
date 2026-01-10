const fs = require('fs');
const data = JSON.parse(fs.readFileSync('live_api.json', 'utf8'));

if (data.routes) {
    data.routes.forEach(r => {
        const text = JSON.stringify(r).toLowerCase();
        if (text.includes('davisville') || text.includes('speed')) {
            console.log('--- Found Route ---');
            console.log('Title:', r.title);
            console.log('Desc:', r.description);
            console.log('Header:', r.headerText);
            console.log('CustomHeader:', r.customHeaderText);
            console.log('Effect:', r.effect);
        }
    });
} else {
    console.log("No routes found");
}
