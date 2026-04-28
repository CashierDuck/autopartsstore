

// CC auth is proxied through our own server to avoid CORS issues
async function creditCardAuthorization(trans, cc, name, exp, amount) {
    try {
        const response = await fetch('/api/authorize', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify({ trans, cc, name, exp, amount })
        });

        const result = await response.text();
        console.log(result);

        return result;
    } catch (error) {
        console.error('Payment error:', error);
        throw error;
    }
}


