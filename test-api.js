async function testFetchCard() {
    const userId = 7;
    try {
        console.log(`Fetching card for User ID: ${userId}...`);
        const response = await fetch(`http://localhost:5000/api/users/${userId}/card`);
        const data = await response.json();

        console.log('Status:', response.status);
        console.log('Data:', data);
    } catch (err) {
        console.error('Fetch failed:', err.message);
    }
}

testFetchCard();
