// eslint-disable-next-line @typescript-eslint/no-require-imports
const { Resend } = require('resend');

// Check if API key is provided
const apiKey = process.env.RESEND_API_KEY;
if (!apiKey) {
    console.error('Please provide RESEND_API_KEY as an environment variable.');
    process.exit(1);
}

const resend = new Resend(apiKey);

async function getAudiences() {
    try {
        const { data, error } = await resend.audiences.list();

        if (error) {
            console.error('Error fetching audiences:', error);
            return;
        }

        if (data && data.length > 0) {
            console.log('\nFound Audiences:');
            data.forEach(audience => {
                console.log(`- Name: ${audience.name}`);
                console.log(`  ID: ${audience.id}`);
            });
            console.log('\nCopy the ID above and paste it into RESEND_AUDIENCE_ID in .env.local');
        } else {
            console.log('\nNo audiences found. Creating "Waitlist" audience...');
            // Create default audience if none exists
            const create = await resend.audiences.create({ name: 'Waitlist' });
            if (create.error) {
                console.error('Error creating audience:', create.error);
            } else {
                console.log(`\nCreated "Waitlist" Audience!`);
                console.log(`ID: ${create.data.id}`);
                console.log('\nCopy the ID above and paste it into RESEND_AUDIENCE_ID in .env.local');
            }
        }
    } catch (err) {
        console.error('Script error:', err);
    }
}

getAudiences();
