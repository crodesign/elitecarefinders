const fetch = require('node-fetch'); // We can use fetch in Node 18+, but let's just test with native fetch or https
const https = require('https');

https.get('https://www.elitecarefinders.com/wp-json/wp/v2/homes?per_page=5', (res) => {
    let data = '';
    res.on('data', chunk => data += chunk);
    res.on('end', () => {
        if (res.statusCode === 200) {
            try {
                const homes = JSON.parse(data);
                console.log(`Successfully fetched ${homes.length} homes from WP API.`);
                if (homes.length > 0) {
                    console.log('Sample WP Slug:', homes[0].slug);
                    console.log('Sample WP Title:', homes[0].title.rendered);
                }
            } catch (e) {
                console.error('Error parsing WP API JSON:', e);
            }
        } else {
            console.error(`WP API failed with status ${res.statusCode}`);
            console.log('Response:', data.substring(0, 500));
        }
    });
}).on('error', err => {
    console.error('HTTPS Error:', err.message);
});
