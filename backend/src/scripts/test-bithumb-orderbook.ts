/**
 * Test Bithumb Orderbook API
 */

async function testBithumbOrderbook() {
  console.log('Testing Bithumb Orderbook API for BTC...\n');

  try {
    const response = await fetch('https://api.bithumb.com/public/orderbook/BTC_KRW');
    console.log('Response status:', response.status);

    const data: any = await response.json();
    console.log('\nResponse data keys:', Object.keys(data));
    console.log('Status:', data.status);

    if (data.data) {
      console.log('\nOrderbook data keys:', Object.keys(data.data));
      console.log('Timestamp:', data.data.timestamp);
      console.log('Payment currency:', data.data.payment_currency);
      console.log('Order currency:', data.data.order_currency);

      if (data.data.bids && data.data.bids.length > 0) {
        console.log('\nTop 3 bids:');
        data.data.bids.slice(0, 3).forEach((bid: any, i: number) => {
          console.log(`  ${i + 1}. Price: ${bid.price}, Quantity: ${bid.quantity}`);
        });
      }

      if (data.data.asks && data.data.asks.length > 0) {
        console.log('\nTop 3 asks:');
        data.data.asks.slice(0, 3).forEach((ask: any, i: number) => {
          console.log(`  ${i + 1}. Price: ${ask.price}, Quantity: ${ask.quantity}`);
        });
      }
    }
  } catch (error) {
    console.error('Error:', error);
  }
}

testBithumbOrderbook();
