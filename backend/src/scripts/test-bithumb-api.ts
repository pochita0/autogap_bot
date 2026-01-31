/**
 * Test Bithumb API directly
 */

async function testBithumbAPI() {
  console.log('Testing Bithumb API...\n');

  try {
    const response = await fetch('https://api.bithumb.com/public/ticker/ALL_KRW');
    console.log('Response status:', response.status);
    console.log('Response headers:', Object.fromEntries(response.headers.entries()));

    const data: any = await response.json();
    console.log('\nResponse data keys:', Object.keys(data));
    console.log('Status:', data.status);
    console.log('Message:', data.message);

    if (data.data) {
      const symbols = Object.keys(data.data).filter((k) => k !== 'date');
      console.log(`\nFound ${symbols.length} symbols`);
      console.log('Sample symbols:', symbols.slice(0, 10));

      // Show first symbol details
      if (symbols.length > 0) {
        const firstSymbol = symbols[0];
        console.log(`\nFirst symbol (${firstSymbol}) data:`, data.data[firstSymbol]);
      }
    }
  } catch (error) {
    console.error('Error:', error);
  }
}

testBithumbAPI();
