import json
import time
from bybit_deposit_scanner import load_keys, BybitClient

import pandas as pd
import time

def main():
    keys = load_keys('keys.json')
    if not keys: return
    
    api_key = keys.get('BYBIT_API_KEY')
    secret_key = keys.get('BYBIT_API_SECRET')
    client = BybitClient(api_key, secret_key)
    
    print("Fetching ALL Coin Info...")
    # Get all coins
    resp = client._request('GET', '/v5/asset/coin/query-info')
    
    if not resp or resp['retCode'] != 0:
        print(f"Failed to fetch coin info: {resp}")
        return

    coins_data = resp['result']['rows']
    print(f"Found {len(coins_data)} coins. Starting simplified scan...")
    
    results = []
    
    # Store found addresses to minimize API calls if needed? 
    # Actually just iterate. The debug script worked.
    
    for i, item in enumerate(coins_data):
        coin_symbol = item['coin']
        chains = item.get('chains', [])
        
        if i % 10 == 0:
            print(f"Scanning {i}/{len(coins_data)}: {coin_symbol}")
            
        for chain in chains:
            chainType = chain.get('chainType')
            
            # Use the EXACT same method call as the debug script
            addr_resp = client.get_deposit_address(coin_symbol, chainType)
            
            # Check response
            if addr_resp and addr_resp.get('retCode') == 0:
                result_data = addr_resp.get('result', {})
                res_rows = result_data.get('rows', [])
                if res_rows:
                    addr_info = res_rows[0]
                    address = addr_info.get('address')
                    tag = addr_info.get('tag')
                    chain_real = addr_info.get('chain')
                    
                    if address:
                        print(f"  -> MATCH: {coin_symbol} on {chainType} => {address}")
                        results.append({
                            'coin': coin_symbol,
                            'chainType': chainType,
                            'address': address,
                            'tag': tag,
                            'chain': chain_real
                        })
            
            # Small delay to be safe
            # time.sleep(0.02)
            
    # Save
    if results:
        df = pd.DataFrame(results)
        df.to_csv('bybit_deposit_addresses_v3.csv', index=False)
        print(f"Done! Saved {len(results)} addresses to bybit_deposit_addresses_v3.csv")
    else:
        print("Still found 0 addresses. This is extremely weird given the debug script worked.")

if __name__ == "__main__":
    main()
