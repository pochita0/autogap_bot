import requests
import hmac
import base64
import json
import time
import pandas as pd
import datetime

# Helper to load keys (same as others)
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

class OKXClient:
    def __init__(self, api_key, secret_key, passphrase):
        self.api_key = api_key
        self.secret_key = secret_key
        self.passphrase = passphrase
        self.base_url = "https://www.okx.com"

    def _sign(self, timestamp, method, request_path, body=''):
        message = f"{timestamp}{method}{request_path}{body}"
        mac = hmac.new(bytes(self.secret_key, encoding='utf-8'), bytes(message, encoding='utf-8'), digestmod='sha256')
        d = mac.digest()
        return base64.b64encode(d).decode('utf-8')

    def _request(self, method, endpoint, params=None):
        timestamp = datetime.datetime.utcnow().isoformat()[:-3] + 'Z'
        
        # OKX query params for GET are appended to url for signature
        url = f"{self.base_url}{endpoint}"
        request_path = endpoint
        
        if method == 'GET' and params:
            from urllib.parse import urlencode
            query = urlencode(params)
            url += f"?{query}"
            request_path += f"?{query}"
            
        body = ''
        if method == 'POST' and params:
            body = json.dumps(params)
            
        signature = self._sign(timestamp, method, request_path, body)
        
        headers = {
            'OK-ACCESS-KEY': self.api_key,
            'OK-ACCESS-SIGN': signature,
            'OK-ACCESS-TIMESTAMP': timestamp,
            'OK-ACCESS-PASSPHRASE': self.passphrase,
            'Content-Type': 'application/json'
        }
        
        try:
            if method == 'GET':
                resp = requests.get(url, headers=headers)
            else:
                resp = requests.post(url, headers=headers, data=body)
            return resp.json()
        except Exception as e:
            print(f"Error: {e}")
            return None

    def get_currencies(self):
        # Get list of all currencies and their chains
        return self._request('GET', '/api/v5/asset/currencies')

    def get_deposit_address(self, ccy):
        return self._request('GET', '/api/v5/asset/deposit-address', {'ccy': ccy})

def main():
    keys = load_keys('keys.json')
    if not keys:
        print("keys.json not found")
        return

    api_key = keys.get('OKX_API_KEY')
    secret_key = keys.get('OKX_API_SECRET')
    passphrase = keys.get('OKX_PASSPHRASE')

    if not all([api_key, secret_key, passphrase]):
        print("Missing OKX keys/passphrase")
        return

    client = OKXClient(api_key, secret_key, passphrase)

    print("Fetching OKX currencies...")
    currencies_resp = client.get_currencies()
    
    if not currencies_resp or currencies_resp.get('code') != '0':
        print(f"Failed to fetch currencies: {currencies_resp}")
        return

    data = currencies_resp.get('data', [])
    print(f"Found {len(data)} currency configs.")
    
    # Extract unique currencies
    ccy_list = set([item['ccy'] for item in data])
    print(f"Unique Currencies: {len(ccy_list)}")
    
    results = []
    
    for i, ccy in enumerate(sorted(ccy_list)):
        print(f"[{i+1}/{len(ccy_list)}] Checking {ccy}...")
        
        # OKX returns all addresses for a ccy (all chains) in one call
        resp = client.get_deposit_address(ccy)
        
        if resp and resp.get('code') == '0':
            addrs = resp.get('data', [])
            for addr_info in addrs:
                print(f"  -> Found {addr_info['chain']}: {addr_info['addr']}")
                results.append({
                    'currency': ccy,
                    'chain': addr_info.get('chain'),
                    'address': addr_info.get('addr'),
                    'tag': addr_info.get('tag'),
                    'selected': addr_info.get('selected')
                })
        else:
            # Code 51000 or others mean no address generated or not supported
            # print(f"  -> No address found or error: {resp.get('data') or resp.get('msg')}")
            pass
            
        time.sleep(0.1)

    df = pd.DataFrame(results)
    df.to_csv('okx_deposit_addresses.csv', index=False)
    print("Done. Saved to okx_deposit_addresses.csv")

if __name__ == "__main__":
    main()
