import requests
import hmac
import hashlib
import json
import time
import pandas as pd
from urllib.parse import urlencode

def load_keys(file_path):
    keys = {}
    try:
        with open(file_path, 'r') as f:
            for line in f:
                line = line.strip()
                if not line or line.startswith('#'):
                    continue
                if '=' in line:
                    key, value = line.split('=', 1)
                    keys[key.strip()] = value.strip()
    except FileNotFoundError:
        return None
    return keys

class BybitClientFinal:
    def __init__(self, api_key, secret_key):
        self.api_key = api_key
        self.secret_key = secret_key
        self.base_url = "https://api.bybit.com"

    def _get_signature(self, params_str, timestamp):
        # Bybit v5 signature: HMAC_SHA256(timestamp + apiKey + recvWindow + params, secret)
        recv_window = "5000"
        payload = f"{timestamp}{self.api_key}{recv_window}{params_str}"
        return hmac.new(bytes(self.secret_key, "utf-8"), payload.encode("utf-8"), hashlib.sha256).hexdigest()

    def _request(self, method, endpoint, params=None):
        timestamp = str(int(time.time() * 1000))
        recv_window = "5000"
        
        params_str = ""
        url = f"{self.base_url}{endpoint}"
        
        if method == "GET" and params:
            # Sort params is recommended but not strictly required for v5 if consistent
            # But let's use urlencode
            params_str = urlencode(params)
            url = f"{url}?{params_str}"
        elif method == "POST":
            params_str = json.dumps(params) if params else ""
            
        signature = self._get_signature(params_str, timestamp)

        headers = {
            "X-BAPI-API-KEY": self.api_key,
            "X-BAPI-SIGN": signature,
            "X-BAPI-SIGN-TYPE": "2",
            "X-BAPI-TIMESTAMP": timestamp,
            "X-BAPI-RECV-WINDOW": recv_window,
            "Content-Type": "application/json"
        }

        try:
            if method == "GET":
                resp = requests.get(url, headers=headers)
            else:
                resp = requests.post(url, headers=headers, data=params_str)
            return resp.json()
        except Exception as e:
            print(f"Request Error: {e}")
            return None

    def get_all_coins(self):
        # Fetch all coin info
        return self._request('GET', '/v5/asset/coin/query-info')

    def get_deposit_address(self, coin, chain_type):
        return self._request('GET', '/v5/asset/deposit/query-address', {'coin': coin, 'chainType': chain_type})

def main():
    print("Starting Bybit Final Scan...")
    keys = load_keys('keys.json')
    if not keys:
        print("keys.json not found")
        return
        
    api_key = keys.get('BYBIT_API_KEY')
    secret_key = keys.get('BYBIT_API_SECRET')
    
    if not api_key or not secret_key:
        print("Bybit keys missing in keys.json")
        return

    client = BybitClientFinal(api_key, secret_key)
    
    # 1. Fetch all coin info
    print("Fetching coin info from Bybit...")
    coin_resp = client.get_all_coins()
    
    if not coin_resp or coin_resp.get('retCode') != 0:
        print(f"Error fetching coin info: {coin_resp}")
        return

    coins_rows = coin_resp.get('result', {}).get('rows', [])
    print(f"Successfully fetched {len(coins_rows)} coins config.")
    
    results = []
    
    # 2. Iterate
    for i, row in enumerate(coins_rows):
        coin = row['coin']
        chains = row.get('chains', [])
        
        # Log progress occasionally
        if i % 20 == 0:
            print(f"Processing {i}/{len(coins_rows)}: {coin}")
            
        for chain in chains:
            chain_type = chain.get('chainType')
            if not chain_type:
                continue
                
            # Request deposit address
            # Retry logic for robustness
            max_retries = 3
            for attempt in range(max_retries):
                try:
                    addr_resp = client.get_deposit_address(coin, chain_type)
                    
                    if addr_resp and addr_resp.get('retCode') == 0:
                        addr_rows = addr_resp.get('result', {}).get('rows', [])
                        if addr_rows:
                            addr_data = addr_rows[0]
                            address = addr_data.get('address')
                            tag = addr_data.get('tag')
                            
                            if address:
                                print(f"  [FOUND] {coin} ({chain_type}): {address} (Tag: {tag})")
                                results.append({
                                    'coin': coin,
                                    'chain_type': chain_type,
                                    'address': address,
                                    'tag': tag
                                })
                        break # Success, break retry loop
                    elif addr_resp and addr_resp.get('retCode') == 10002:
                         # Timestamp error?
                         time.sleep(1)
                         continue
                    else:
                        # logical error or no address e.g. retCode=0 but rows=[]
                        # This counts as "checked", break retry
                        break
                except Exception as e:
                    print(f"  Error checking {coin}-{chain_type}: {e}")
                    time.sleep(1)
            
            # Rate limit politeness
            time.sleep(0.05)

    # 3. Save
    if results:
        df = pd.DataFrame(results)
        df.to_csv('bybit_deposit_addresses_final.csv', index=False)
        print(f"\nScan Complete. Saved {len(results)} addresses to 'bybit_deposit_addresses_final.csv'.")
    else:
        print("\nScan Complete. No addresses found.")

if __name__ == "__main__":
    main()
