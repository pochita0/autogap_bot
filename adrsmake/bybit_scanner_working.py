import json
import time
import requests
import hmac
import hashlib
from urllib.parse import urlencode
import pandas as pd

# Load Keys directly
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
    except:
        return None
    return keys

# EXACT Client class from the working debug script
class BybitClientWorking:
    def __init__(self, api_key, secret_key):
        self.api_key = api_key
        self.secret_key = secret_key
        self.base_url = "https://api.bybit.com"

    def _get_signature(self, params_str, timestamp):
        recv_window = "5000"
        payload = f"{timestamp}{self.api_key}{recv_window}{params_str}"
        return hmac.new(bytes(self.secret_key, "utf-8"), payload.encode("utf-8"), hashlib.sha256).hexdigest()

    def _request(self, method, endpoint, params=None):
        timestamp = str(int(time.time() * 1000))
        recv_window = "5000"
        
        # EXACT logic from debug script
        params_str = ""
        url = f"{self.base_url}{endpoint}"

        if method == "GET" and params:
            # Manually construct query string to match exactly what worked
            # debug script used: url = f"{self.base_url}{endpoint}?{params_str}"
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
        except:
            return None

    def get_deposit_address(self, coin, chain_type):
        return self._request('GET', '/v5/asset/deposit/query-address', {'coin': coin, 'chainType': chain_type})

def main():
    keys = load_keys('keys.json')
    if not keys: return
    
    api_key = keys.get('BYBIT_API_KEY')
    secret_key = keys.get('BYBIT_API_SECRET')
    client = BybitClientWorking(api_key, secret_key)
    
    print("Fetching ALL Coins...")
    # Get all coins
    resp = client._request('GET', '/v5/asset/coin/query-info')
    if not resp or resp['retCode'] != 0:
        print("Fail")
        return

    coins_data = resp['result']['rows']
    results = []
    
    print(f"Scanning {len(coins_data)} coins...")
    
    for i, item in enumerate(coins_data):
        coin = item['coin']
        chains = item.get('chains', [])
        
        if i % 50 == 0:
            print(f"Checking {i}...")

        for chain in chains:
            chainType = chain.get('chainType')
            
            # Using the working method
            # Add small sleep to avoid rate limit (which caused empty results before?)
            time.sleep(0.05) 
            
            addr_resp = client.get_deposit_address(coin, chainType)
            
            if addr_resp and addr_resp.get('retCode') == 0:
                rows = addr_resp.get('result', {}).get('rows', [])
                if rows:
                    addr_data = rows[0]
                    addr = addr_data.get('address')
                    if addr:
                        print(f"FOUND: {coin} ({chainType}) -> {addr}")
                        results.append({
                            'coin': coin,
                            'chain': chainType,
                            'address': addr,
                            'tag': addr_data.get('tag')
                        })

    if results:
        df = pd.DataFrame(results)
        df.to_csv('bybit_deposit_addresses_success.csv', index=False)
        print("Done. Saved to bybit_deposit_addresses_success.csv")
    else:
        print("Zero found.")

if __name__ == "__main__":
    main()
