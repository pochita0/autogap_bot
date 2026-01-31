import requests
import hmac
import hashlib
import json
import time
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
    except FileNotFoundError:
        return None
    return keys

class BybitClient:
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
        if method == "GET" and params:
            from urllib.parse import urlencode
            params_str = urlencode(params)
            url = f"{self.base_url}{endpoint}?{params_str}"
        elif method == "POST":
            import json
            params_str = json.dumps(params) if params else ""
            url = f"{self.base_url}{endpoint}"
        else:
            url = f"{self.base_url}{endpoint}"

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

    def get_coin_info(self):
        return self._request('GET', '/v5/asset/coin/query-info')

    def get_deposit_address(self, coin, chain_type):
        return self._request('GET', '/v5/asset/deposit/query-address', {'coin': coin, 'chainType': chain_type})

def is_evm_chain(chain_type):
    # Common EVM chain codes on Bybit
    evm_chains = [
        'ETH', 'BSC', 'Arbitrum One', 'ARBI', 'MANTLE', 'MATIC', 'AVAXC', 'OPTIMISM', 'OP', 
        'ZKST', 'ZKSYNC', 'LINEA', 'BASE', 'CELO', 'FTM', 'GLMR', 'MOVR', 'KAVA', 'KAVAEVM'
    ]
    if chain_type.upper() in evm_chains:
        return True
    if 'ERC20' in chain_type.upper() or 'BEP20' in chain_type.upper():
        return True
    return False

def main():
    keys = load_keys('keys.json')
    if not keys: return
    
    api_key = keys.get('BYBIT_API_KEY')
    secret_key = keys.get('BYBIT_API_SECRET')
    client = BybitClient(api_key, secret_key)
    
    print("Fetching Coin Info...")
    resp = client.get_coin_info()
    if not resp or resp.get('retCode') != 0:
        print("Failed to fetch coin info")
        return

    coins_data = resp['result']['rows']
    results = []
    
    # Store the master EVM address if found
    evm_master_address = None
    
    print(f"Scanning {len(coins_data)} coins...")
    
    # Second pass: Scan everything
    for i, item in enumerate(coins_data):
        if i % 10 == 0:
            print(f"Processing {i}/{len(coins_data)}...")
        coin = item['coin']
        chains = item.get('chains', [])
        
        for chain_info in chains:
            chain_type = chain_info.get('chainType')
            if not chain_type: continue
            
            # API Call
            addr_resp = client.get_deposit_address(coin, chain_type)
            address = None
            tag = None
            
            if addr_resp and addr_resp.get('retCode') == 0:
                result = addr_resp.get('result', {})
                rows = result.get('rows', []) if result else []
                if rows:
                    address = rows[0].get('address')
                    tag = rows[0].get('tag')
                    print(f"  -> Found {coin} on {chain_type}: {address}")
            
            # If we found an EVM address (starts with 0x), save it as master
            if address and address.startswith('0x') and len(address) == 42:
                 if not evm_master_address:
                     print(f"  [!] Found Master EVM Address: {address} (from {coin}-{chain_type})")
                     evm_master_address = address
            
            results.append({
                'coin': coin,
                'chain': chain_type,
                'address': address,
                'tag': tag
            })
            time.sleep(0.05) # fast scan

    # Post-processing: Fill in missing EVM addresses
    final_results = []
    if evm_master_address:
        print(f"Applying Master EVM Address ({evm_master_address}) to missing fields...")
        for res in results:
            if not res['address']:
                # Heuristic: If chain is likely EVM, fill it
                c_type = res['chain']
                if is_evm_chain(c_type) or c_type == 'ETH' or c_type == 'BSC':
                     res['address'] = evm_master_address
                     res['note'] = 'Inferred from Master EVM'
            final_results.append(res)
    else:
        final_results = results

    # Save
    df = pd.DataFrame(final_results)
    # Filter only rows with address
    df_found = df[df['address'].notna()]
    
    df_found.to_csv('bybit_deposit_addresses_fixed.csv', index=False)
    print(f"Done. Saved {len(df_found)} addresses to bybit_deposit_addresses_fixed.csv")

if __name__ == "__main__":
    main()
