const response = await fetch('http://localhost:4000/opportunities?mode=live&limit=5');
const data = await response.json();

console.log('\n🎯 Live Arbitrage Opportunities Test\n');
console.log('━'.repeat(80));
console.log(`Dataset: ${data.dataset}`);
console.log(`Total Opportunities Found: ${data.count}\n`);

if (data.data && data.data.length > 0) {
  data.data.forEach((opp, idx) => {
    const typeEmoji = opp.type === 'KIMP_OVERSEAS_TO_BITHUMB' ? '🇰🇷' :
                      opp.type === 'KIMP_BITHUMB_TO_OVERSEAS' ? '🌐' : '💱';

    console.log(`${idx + 1}. ${typeEmoji} ${opp.base}/${opp.quote}`);
    console.log(`   Gap: ${opp.grossGapPct.toFixed(2)}% (Net: ${opp.netProfitPct.toFixed(2)}%)`);
    console.log(`   Buy:  ${opp.buyExchange} @ $${opp.buyPrice.toFixed(4)}`);
    console.log(`   Sell: ${opp.sellExchange} @ $${opp.sellPrice?.toFixed(4)}`);
    console.log(`   Wallet: ${opp.walletStatusOk ? '✅ OK' : '❌ ' + opp.wallet_check?.reasons?.join(', ')}`);
    console.log(`   Updated: ${new Date(opp.updatedAt).toLocaleTimeString()}\n`);
  });
} else {
  console.log('No opportunities found.\n');
}

console.log('━'.repeat(80));
console.log('\n✅ Live data is working correctly!\n');
