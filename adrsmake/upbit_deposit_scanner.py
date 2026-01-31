import jwt
import uuid
import hashlib
import time
import requests
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

class UpbitClient:
    def __init__(self, access_key, secret_key):
        self.access_key = access_key
        self.secret_key = secret_key
        self.server_url = "https://api.upbit.com"

    def _get_token(self, query_params=None):
        payload = {
            'access_key': self.access_key,
            'nonce': str(uuid.uuid4()),
        }
        
        if query_params:
            query_string = urlencode(query_params)
            m = hashlib.sha512()
            m.update(query_string.encode('utf-8'))
            query_hash = m.hexdigest()
            payload['query_hash'] = query_hash
            payload['query_hash_alg'] = 'SHA512'

        jwt_token = jwt.encode(payload, self.secret_key, algorithm='HS256')
        return jwt_token

    def _request(self, method, endpoint, params=None):
        url = self.server_url + endpoint
        headers = {}
        
        # Upbit requires token in Authorization header
        token = self._get_token(params)
        headers['Authorization'] = f'Bearer {token}'
        
        try:
            if method == 'GET':
                resp = requests.get(url, params=params, headers=headers)
            else:
                resp = requests.post(url, json=params, headers=headers)
            return resp.json()
        except Exception as e:
            print(f"Error: {e}")
            return None

    def get_market_all(self):
        # Public
        url = self.server_url + "/v1/market/all"
        return requests.get(url, params={'isDetails': 'false'}).json()

    def get_deposit_addresses(self):
        # Returns all currently generated addresses (with currency, net_type, etc)
        # Note: Upbit API documentation says GET /v1/deposits/coin_addresses returns keys
        # for generated addresses.
        return self._request('GET', '/v1/deposits/coin_addresses')

    def generate_coin_address(self, currency, net_type=None):
        # POST /v1/deposits/generate_coin_address
        # params: currency, net_type (optional? depending on coin)
        params = {'currency': currency}
        if net_type:
            params['net_type'] = net_type # Upbit param naming check needed
            # Actually, Upbit 'generate_coin_address' takes 'currency'. 
            # net_type support was added for some coins? 
            # Docs say: currency, net_type.
            pass
            
        return self._request('POST', '/v1/deposits/generate_coin_address', params)

def main():
    keys = load_keys('keys.json')
    if not keys:
        return

    api_key = keys.get('UPBIT_API_KEY')
    secret_key = keys.get('UPBIT_API_SECRET')
    
    if not api_key or not secret_key:
        print("Missing Upbit keys")
        return

    client = UpbitClient(api_key, secret_key)
    
    # 1. Get all markets to know which coins exit
    print("Fetching Upbit Markets...")
    markets = client.get_market_all()
    if isinstance(markets, dict) and markets.get('error'):
        print(f"Error fetching markets: {markets}")
        return
        
    currencies = set()
    for m in markets:
        if m['market'].startswith('KRW-') or m['market'].startswith('BTC-') or m['market'].startswith('USDT-'):
            currencies.add(m['market'].split('-')[1])
            
    print(f"Found {len(currencies)} currencies.")

    # 2. Get existing addresses first
    print("Fetching existing addresses...")
    existing_list = client.get_deposit_addresses()
    
    # Map existing: currency -> list of addresses
    existing_map = {}
    if isinstance(existing_list, list):
        for item in existing_list:
            ccy = item.get('currency')
            if ccy:
                if ccy not in existing_map:
                    existing_map[ccy] = []
                existing_map[ccy].append(item)
    else:
        print(f"Error checking existing addresses: {existing_list}")
        existing_list = []

    results = []
    
    # 3. For each currency, if address exists, save it.
    # If not, try to generate it? 
    # Caution: Generating 100+ addresses might trigger limits or require confirm.
    # We will try to generate for ALL currencies.
    
    # Correction: get_withdraw_chance should be a method of UpbitClient, or we add valid_net_types logic here.
    # But for now, let's just add the method to the class dynamically or use the client object.
    # Actually, I pasted the def inside main() in previous turn which is wrong or dirty. 
    # Let's fix the class definition above, but replace_file_content targets a block.
    # I'll just add a helper function here or assume I added it to class? 
    # No, I put it inside main in the previous tool use.
    # Let's clean it up properly.
    
    # Better approach: Just define a helper function or use client._request directly.
    def get_withdraw_chance_helper(curr):
         return client._request('GET', '/v1/withdraws/chance', {'currency': curr})

    for i, ccy in enumerate(sorted(currencies)):

        print(f"[{i+1}/{len(currencies)}] Checking {ccy}...")
        
        # Check if we have it
        if ccy in existing_map:
            for item in existing_map[ccy]:
                print(f"  -> Found existing: {item.get('deposit_address')}")
                results.append(item)
        else:
            # Try to generate
            print(f"  -> Requesting generation for {ccy}...")
            
            # 1. Try default (no net_type) first
            resp = client.generate_coin_address(ccy)
            
            success = False
            if isinstance(resp, dict):
                if resp.get('success'):
                    print("    -> Generation requested (Async).")
                    results.append({'currency': ccy, 'deposit_address': 'PENDING_GENERATION', 'net_type': 'Default'})
                    success = True
                elif resp.get('error'):
                     err_msg = resp.get('error').get('message')
                     # print(f"    -> Error: {err_msg}")
                     
                     # 2. If invalid parameter, try to find net_type
                     if "잘못된 파라미터" in err_msg or "Invalid parameter" in err_msg:
                         # Fetch withdraw chance info
                         # Note: withdraws/chance usually returns 'currency': {...}, 'net_type_support': ... or similar?
                         # Actually Upbit API docs say for 'withdraws/chance':
                         # Returns: currency dictionary, account dictionary, etc.
                         # It usually contains 'withdraw_limit' and sometimes 'net_type' info in 'currency' object?
                         # Let's verify structure by calling it.
                         
                         w_chance = get_withdraw_chance_helper(ccy)
                         
                         possible_nets = []
                         # Upbit response structure for withdraws/chance:
                         # { "member_level": ..., "currency": { "code": "BTC", "withdraw_fee": ... }, ... }
                         # It doesn't explicitly list "supported deposit net_types".
                         # However, sometimes we can infer or brute force common ones.
                         
                         # Common Upbit net types:
                         # ETH, TRX, XRP, FIL, SOL, ADA, ETC, ... (for native)
                         # ERC20, TRC20, BSC, ... (for tokens)
                         # Upbit usually uses the ticker symbol as net_type for native (e.g. BTC -> net_type=BTC?)
                         # Or for tokens: net_type=ETH for ERC20.
                         
                         # Let's try 2 common guesses:
                         # 1. net_type = ccy (Native)
                         # 2. net_type = 'ETH' (ERC20)
                         # 3. net_type = 'TRX' (TRC20)
                         
                         net_guesses = [ccy, 'ETH', 'TRX', 'BSC', 'SOL', 'MATIC']
                         
                         # Ensure unique
                         net_guesses = list(dict.fromkeys(net_guesses))
                         
                         retry_success = False
                         for net in net_guesses:
                             if net == 'Default': continue
                             
                             # Don't try ETH for BTC, obviously? But API handles invalid safely.
                             # print(f"    -> Retrying with net_type={net}...")
                             resp2 = client.generate_coin_address(ccy, net_type=net)
                             
                             if isinstance(resp2, dict) and resp2.get('success'):
                                print(f"    -> Generation requested (net_type={net}).")
                                results.append({'currency': ccy, 'deposit_address': 'PENDING_GENERATION', 'net_type': net})
                                retry_success = True
                                break
                             # else:
                             #   print(f"      -> Failed: {resp2.get('error').get('message')}")
                                
                         if not retry_success:
                             print(f"    -> Failed to generate with common networks. Error: {err_msg}")
                     else:
                         print(f"    -> Error: {err_msg}")

            time.sleep(0.12)
                             
    # Save what we have
    # Since Upbit generation is async, we might not get the new addresses immediately.
    # But we record the request.
    df = pd.DataFrame(results)
    df.to_csv('upbit_deposit_addresses.csv', index=False)
    print("Done. Saved to upbit_deposit_addresses.csv")

if __name__ == "__main__":
    main()
