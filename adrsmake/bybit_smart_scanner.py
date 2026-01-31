import json
import time
import requests
import hmac
import hashlib
from urllib.parse import urlencode
import pandas as pd

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

class BybitSmartClient:
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
        params_str = ""
        url = f"{self.base_url}{endpoint}"

        if method == "GET" and params:
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
            print(f"Error: {e}")
            return None

    def get_deposit_address(self, coin, chain_type):
        return self._request('GET', '/v5/asset/deposit/query-address', {'coin': coin, 'chainType': chain_type})

def is_evm(chain_type):
    # List of known EVM chains
    # If chainType contains these, it's likely EVM
    evm_keywords = [
        'ETH', 'BSC', 'ERC20', 'BEP20', 'ARBI', 'OPTIMISM', 'MATIC', 'POLYGON', 
        'AVAXC', 'CELO', 'FTM', 'MANTLE', 'ZK', 'LINEA', 'BASE', 'KAVA'
    ]
    ct = chain_type.upper()
    for kw in evm_keywords:
        if kw in ct:
            return True
    return False

def main():
    keys = load_keys('keys.json')
    if not keys: return
    
    api_key = keys.get('BYBIT_API_KEY')
    secret_key = keys.get('BYBIT_API_SECRET')
    client = BybitSmartClient(api_key, secret_key)
    
    print("Fetching ALL Coin Info...")
    resp = client._request('GET', '/v5/asset/coin/query-info')
    if not resp or resp.get('retCode') != 0:
        print("Failed to fetch coin info")
        return

    coins_data = resp['result']['rows']
    print(f"Total coins: {len(coins_data)}")

    results = []
    
    # 1. Find EVM Master Address
    # Try USDT first, then CELO, then ETH
    evm_master = None
    print("Searching for Master EVM Address...")
    
    test_targets = [
        ('USDT', 'ERC20'), ('USDT', 'BSC'), ('USDT', 'CAVAX'), ('CELO', 'CELO'), 
        ('ETH', 'ETH'), ('BNB', 'BSC')
    ]
    
    for coin, chain in test_targets:
        if evm_master: break
        print(f"  Checking {coin} on {chain}...")
        addr_resp = client.get_deposit_address(coin, chain)
        if addr_resp and addr_resp.get('retCode') == 0:
            result = addr_resp.get('result', {})
            rows = result.get('rows', []) if result else []
            if rows:
                addr = rows[0].get('address')
                if addr and addr.startswith('0x'):
                    evm_master = addr
                    print(f"  [SUCCESS] Found Master EVM Address: {evm_master}")
    
    if not evm_master:
        print("  [WARNING] Could not find Master EVM Address. Will slow scan everything.")

    # 2. Iterate all coins
    print("Starting Smart Scan...")
    
    for i, item in enumerate(coins_data):
        coin = item['coin']
        chains = item.get('chains', [])
        
        if i % 50 == 0:
            print(f"Processing {i}/{len(coins_data)} : {coin}")
            
        for chain_info in chains:
            chainType = chain_info.get('chainType')
            if not chainType: continue
            
            # Strategy:
            # If EVM and we have master, use master.
            # Else, query API.
            
            address = None
            tag = None
            is_inferred = False
            
            if evm_master and is_evm(chainType):
                address = evm_master
                is_inferred = True
                # Log inferred only occasionally or not at all to keep clean
                # print(f"  -> Inferred {coin} ({chainType}): {address}")
            else:
                # Query API
                # Don't query if it's likely EVM but inference failed? No, query everything else.
                time.sleep(0.04) # Rate limit
                addr_resp = client.get_deposit_address(coin, chainType)
                if addr_resp and addr_resp.get('retCode') == 0:
                     result = addr_resp.get('result', {})
                     rows = result.get('rows', []) if result else []
                     if rows:
                         address = rows[0].get('address')
                         tag = rows[0].get('tag')
                         if address:
                             print(f"  -> FOUND via API: {coin} ({chainType}): {address}")
            
            if address:
                results.append({
                    'coin': coin,
                    'chain_type': chainType,
                    'address': address,
                    'tag': tag,
                    'method': 'inferred' if is_inferred else 'api'
                })

    # Save
    if results:
        df = pd.DataFrame(results)
        df.to_csv('bybit_deposit_addresses_smart.csv', index=False)
        print(f"Done. Saved {len(results)} addresses to bybit_deposit_addresses_smart.csv")
    else:
        print("No addresses found.")

if __name__ == "__main__":
    main()
