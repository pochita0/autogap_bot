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
        # Bybit v5 signature: HMAC_SHA256(timestamp + apiKey + recvWindow + params, secret)
        recv_window = "5000"
        payload = f"{timestamp}{self.api_key}{recv_window}{params_str}"
        return hmac.new(bytes(self.secret_key, "utf-8"), payload.encode("utf-8"), hashlib.sha256).hexdigest()

    def _request(self, method, endpoint, params=None):
        timestamp = str(int(time.time() * 1000))
        recv_window = "5000"
        
        params_str = ""
        if method == "GET" and params:
            # Sort params and create query string for GET? 
            # Bybit v5: for GET, params_str is the query string (key=value&...)
            # Note: Bybit requests usually require sorted params for some libs, but v5 doc says raw query string.
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
        # /v5/asset/coin/query-info
        return self._request('GET', '/v5/asset/coin/query-info')

    def get_deposit_address(self, coin, chain_type):
        # /v5/asset/deposit/query-address
        return self._request('GET', '/v5/asset/deposit/query-address', {'coin': coin, 'chainType': chain_type})

def main():
    keys = load_keys('keys.json')
    if not keys:
        return
        
    api_key = keys.get('BYBIT_API_KEY')
    secret_key = keys.get('BYBIT_API_SECRET')
    
    if not api_key or not secret_key:
        print("Missing Bybit keys")
        return

    client = BybitClient(api_key, secret_key)
    
    print("Fetching Bybit Coins...")
    # Bybit returns paginated coin info? Or all?
    # /v5/asset/coin/query-info returns rows.
    # Default limit might verify.
    # Let's try to fetch all if needed, but docs say "Returns all coins" usually for query-info if no coin specified?
    # Actually checking docs: "coin" is optional.
    
    resp = client.get_coin_info()
    if not resp or resp.get('retCode') != 0:
        print(f"Failed to fetch coins: {resp}")
        return

    coins_data = resp.get('result', {}).get('rows', [])
    print(f"Found {len(coins_data)} coins/chains.")
    
    # Bybit returns rows per coin-chain combination.
    # e.g. Row 1: coin=USDT, chain=ERC20
    # Row 2: coin=USDT, chain=TRC20
    
    results = []
    
    for i, item in enumerate(coins_data):
        coin = item['coin']
        # chain = item['chain'] # Incorrect, chain info is in 'chains' list
        
        # Check if deposit is allowed
        # chains structure: item['chains'] array usually contains details
        chains_info = item.get('chains', [])
        
        # wait, structure of query-info result rows:
        # coin, call chains (list of dicts)
        
        for chain_info in chains_info:
            # Debug: print keys once
            # print(f"DEBUG keys: {chain_info.keys()}")
            # print(f"DEBUG values: {chain_info}")
            # exit() 
            
            # Use 'chainType' explicitly as tested in debug script
            target_chain = chain_info.get('chainType')
            if not target_chain:
                 target_chain = chain_info.get('chain')
            
            # If still None, skip
            if not target_chain:
                continue
            
            deposit_status = chain_info.get('chainDeposit') # '1' for enabled?
            
            if deposit_status == '1': # Assuming 1 is enabled
                print(f"Checking {coin} on {target_chain}...")
                
                # Fetch address
                addr_resp = client.get_deposit_address(coin, target_chain)
                
                if addr_resp and addr_resp.get('retCode') == 0:
                    res_rows = addr_resp.get('result', {}).get('rows', [])
                    if res_rows:
                        addr_data = res_rows[0]
                        print(f"  -> Found: {addr_data['address']}")
                        results.append({
                            'coin': coin,
                            'chain': chain_type,
                            'address': addr_data['address'],
                            'tag': addr_data.get('tag'),
                            'chain_orig': chain_data if 'chain_data' in locals() else ''
                        })
                    else:
                        print("  -> No address returned.")
                else:
                    # print(f"  -> Error: {addr_resp.get('retMsg')}")
                    pass
                
                time.sleep(0.1)

    df = pd.DataFrame(results)
    df.to_csv('bybit_deposit_addresses.csv', index=False)
    print("Done. Saved to bybit_deposit_addresses.csv")

if __name__ == "__main__":
    main()
