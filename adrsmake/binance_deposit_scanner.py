import requests
import time
import hmac
import hashlib
import json
import pandas as pd
from urllib.parse import urlencode

class BinanceClient:
    def __init__(self, api_key, secret_key):
        self.api_key = api_key
        self.secret_key = secret_key
        self.base_url = "https://api.binance.com"

    def _sign(self, params):
        query_string = urlencode(params)
        signature = hmac.new(
            self.secret_key.encode('utf-8'),
            query_string.encode('utf-8'),
            hashlib.sha256
        ).hexdigest()
        return query_string + "&signature=" + signature

    def _request(self, method, endpoint, params=None):
        if params is None:
            params = {}
        
        # Add timestamp
        params['timestamp'] = int(time.time() * 1000)
        params['recvWindow'] = 5000
        
        query_with_signature = self._sign(params)
        url = f"{self.base_url}{endpoint}?{query_with_signature}"
        
        headers = {
            'X-MBX-APIKEY': self.api_key
        }
        
        try:
            if method.upper() == 'GET':
                response = requests.get(url, headers=headers)
            elif method.upper() == 'POST':
                response = requests.post(url, headers=headers) # Params usually in query for Binance signed
            
            # response.raise_for_status() # We handle errors manually
            return response.json()
        except Exception as e:
            print(f"Request error: {e}")
            return None

    def get_all_coins_info(self):
        # /sapi/v1/capital/config/getall
        # Returns information of coins (available for deposit, etc)
        # Verify weight: 10
        return self._request('GET', '/sapi/v1/capital/config/getall')

    def get_deposit_address(self, coin, network=None):
        # /sapi/v1/capital/deposit/address
        params = {'coin': coin}
        if network:
            params['network'] = network
        return self._request('GET', '/sapi/v1/capital/deposit/address', params)

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
        print(f"{file_path} not found.")
        return None
    return keys

def main():
    # Load keys
    keys = load_keys('keys.json')
    if not keys:
        return
        
    api_key = keys.get('BINANCE_API_KEY')
    secret_key = keys.get('BINANCE_API_SECRET')

    if not api_key or not secret_key or "YOUR_" in api_key:
        print("Please ensure BINANCE_API_KEY and BINANCE_API_SECRET are set in keys.json")
        return

    client = BinanceClient(api_key, secret_key)

    print("Fetching coin configurations...")
    coins_info = client.get_all_coins_info()
    
    if not isinstance(coins_info, list):
        print("Failed to fetch coin info or invalid API keys.")
        print(f"Response: {coins_info}")
        return

    print(f"Found {len(coins_info)} coins. Starting scan...")
    
    results = []
    
    for i, coin_data in enumerate(coins_info):
        coin = coin_data['coin']
        
        # Determine networks
        networks_list = coin_data.get('networkList', [])
        
        # If no networks listed, skip or log?
        if not networks_list:
            continue
            
        print(f"[{i+1}/{len(coins_info)}] Checking {coin}...")
        
        for net_data in networks_list:
            network = net_data['network']
            is_deposit_enabled = net_data.get('depositEnable', False)
            
            if is_deposit_enabled:
                # time.sleep(0.05) # Rate limiting (IP weight)
                # Fetch address
                # Note: This does not generate a NEW address usually, just retrieves. 
                # If never generated, it might auto-generate or return empty.
                print(f"  > Fetching address for {coin} ({network})...")
                
                addr_resp = client.get_deposit_address(coin, network)
                
                if isinstance(addr_resp, dict) and 'address' in addr_resp:
                    # Successful
                    addr = addr_resp['address']
                    tag = addr_resp.get('tag', '')
                    url = addr_resp.get('url', '')
                    
                    if addr:
                        print(f"    -> Found: {addr}")
                        results.append({
                            'coin': coin,
                            'network': network,
                            'address': addr,
                            'tag': tag,
                            'url': url,
                            'full_response': str(addr_resp)
                        })
                    else:
                        print(f"    -> No address returned (maybe create not supported via API?)")
                else:
                    print(f"    -> Error fetching address: {addr_resp}")
                    
            else:
                # print(f"  > Deposit disabled for {coin} on {network}")
                pass
        
        # Sleep periodically to avoid hitting weight limits strictly
        # get_deposit_address weight is 10. Limit is 12000 per minute usually?
        # 1 request per coin-network. 
        time.sleep(0.1) 

    # Save
    df = pd.DataFrame(results)
    df.to_csv('binance_deposit_addresses.csv', index=False)
    print("Done. Saved to binance_deposit_addresses.csv")

if __name__ == "__main__":
    main()
