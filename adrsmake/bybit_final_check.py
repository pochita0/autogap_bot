import json
import time
from bybit_deposit_scanner import load_keys, BybitClient

def main():
    keys = load_keys('keys.json')
    if not keys: return
    
    api_key = keys.get('BYBIT_API_KEY')
    secret_key = keys.get('BYBIT_API_SECRET')
    client = BybitClient(api_key, secret_key)
    
    # Debug Coin Info
    print("Sanity Check: Fetching USDT, TRX, TON Info...")
    for coin_symbol in ['USDT', 'TRX', 'TON', 'CELO', 'CAVAX']:
        print(f"\n--- Checking {coin_symbol} ---")
        
        # Retry loop: check 3 times with delay
        for attempt in range(3):
            # query-info for coin
            resp = client._request('GET', '/v5/asset/coin/query-info', {'coin': coin_symbol})
            
            if resp and resp['retCode'] == 0:
                rows = resp['result']['rows']
                if rows:
                    coin_info = rows[0]
                    chains = coin_info.get('chains', [])
                    found_any = False
                    for chain in chains:
                        chainType = chain.get('chainType')
                        # print(f"Checking {coin_symbol} on {chainType} (Attempt {attempt+1})...")
                        addr_resp = client.get_deposit_address(coin_symbol, chainType)
                        
                        if addr_resp and addr_resp.get('retCode') == 0:
                            res_rows = addr_resp.get('result', {}).get('rows', [])
                            if res_rows:
                                print(f"  -> SUCCESS! Found on {chainType}: {res_rows[0]['address']}")
                                found_any = True
                            else:
                                pass # print(f"  -> Empty result for {chainType}")
                        else:
                            print(f"Error fetching address: {addr_resp}")

                    if found_any:
                        break # Stop retrying if found
                else:
                    print("No rows returned for coin info.")
            else:
                print(f"Error fetching coin info: {resp}")
            
            if attempt < 2:
                time.sleep(1) # wait 1 sec before retry

if __name__ == "__main__":
    main()
