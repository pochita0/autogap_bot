import jwt
import uuid
import hashlib
import time
import requests
import json
import pandas as pd
import os
from urllib.parse import urlencode

class BithumbClient:
    def __init__(self, access_key, secret_key):
        self.access_key = access_key
        self.secret_key = secret_key
        self.api_url = "https://api.bithumb.com/v1"

    def _get_token(self, query_params=None):
        payload = {
            'access_key': self.access_key,
            'nonce': str(uuid.uuid4()),
            'timestamp': int(round(time.time() * 1000))
        }
        
        if query_params:
            # Sort keys to ensure deterministic hash matching server expectation
            # Bithumb likely expects alphabetical order of keys or raw string matching body.
            # Safe bet is to sort. 
            # Note: urlencode doesn't guarantee sort in all versions, so we sort dict first?
            # actually urlencode consumes dict order in recent python.
            items = sorted(query_params.items())
            query_string = urlencode(items)
            
            m = hashlib.sha512()
            m.update(query_string.encode('utf-8'))
            query_hash = m.hexdigest()
            payload['query_hash'] = query_hash
            payload['query_hash_alg'] = 'SHA512'

        return jwt.encode(payload, self.secret_key, algorithm='HS256')

    def _request(self, method, endpoint, params=None, data=None):
        headers = {}
        
        # For POST/PUT, the body usually forms the 'query' hash in Bithumb V1/V2
        # For GET, the query params do.
        hash_source = params
        if method.upper() in ['POST', 'PUT'] and data:
            hash_source = data
            
        token = self._get_token(hash_source)
        headers['Authorization'] = f'Bearer {token}'
        headers['Content-Type'] = 'application/json'

        url = f"{self.api_url}{endpoint}"
        
        try:
            if method.upper() == 'GET':
                response = requests.get(url, headers=headers, params=params)
            elif method.upper() == 'POST':
                response = requests.post(url, headers=headers, json=data)
            
            # Print response text if error for debugging
            # if not response.ok:
            #     print(f"Error calling {endpoint}: {response.status_code} {response.reason}")
            #     print(f"Response: {response.text}")
                
            response.raise_for_status()
            return response.json()
        except requests.exceptions.HTTPError as e:
            # Already printed details above
            return None
        except Exception as e:
            print(f"Unexpected error: {e}")
            return None


    def get_markets(self):
        # Public endpoint, no auth needed technically but using _request for consistency if private needed later
        # However v1/market/all is public.
        url = f"{self.api_url}/market/all?isDetails=true"
        try:
            resp = requests.get(url)
            resp.raise_for_status()
            return resp.json()
        except Exception as e:
            print(f"Error fetching markets: {e}")
            return []

    def get_withdraw_chance(self, currency):
        endpoint = "/withdraws/chance"
        params = {'currency': currency, 'net_type': currency} # net_type is technically optional or needed? 
        # API 2.0 Docs say params: currency. 
        # Let's try only currency first as query param.
        return self._request('GET', endpoint, params={'currency': currency})

    def get_existing_addresses(self):
        # Fetch all currently generated addresses if possible
        # Some exchanges allow fetching all, or per currency.
        # Bithumb v1 usually creates/retrieves per currency.
        # Let's assume we check per currency or there is a general endpoint.
        # Search said: GET /v1/deposits/coin_addresses
        endpoint = "/deposits/coin_addresses"
        return self._request('GET', endpoint)

    def generate_address(self, currency, net_type):
        endpoint = "/deposits/generate_coin_address"
        data = {
            'currency': currency,
            'net_type': net_type
        }
        return self._request('POST', endpoint, data=data)

def main():
    # Load keys
    try:
        with open('keys.json', 'r') as f:
            keys = json.load(f)
            if keys['access_key'] == "YOUR_ACCESS_KEY":
                print("Please configure keys.json with your actual API keys.")
                return
    except FileNotFoundError:
        print("keys.json not found. Please create one.")
        return

    client = BithumbClient(keys['access_key'], keys['secret_key'])

    print("Fetching markets...")
    markets = client.get_markets()
    if not markets:
        print("Failed to fetch markets.")
        return

    # Extract unique currencies (e.g. KRW-BTC -> BTC)
    currencies = set()
    for market in markets:
        if market['market'].startswith('KRW-'):
            currencies.add(market['market'].split('-')[1])
        elif market['market'].startswith('BTC-'):
            currencies.add(market['market'].split('-')[1])
    
    print(f"Found {len(currencies)} currencies.")
    
    results = []

    # Bithumb API rate limit is usually strict. Be careful.
    
    consecutive_auth_errors = 0
    MAX_AUTH_ERRORS = 3
    
    # Common network types to try. 
    # Bithumb uses specific strings. We try the currency itself first, then these.
    COMMON_NETWORKS = [
        'ERC20', 'BEP20', 'TRC20', 'POLYGON', 'SOL', 'ARBITRUM', 'OPTIMISM', 
        'KLAY', 'AVAX', 'ADA', 'XRP', 'EOS', 'STEEM', 'HBAR', 'XLM', 'ATOM', 'DOT',
        'ETH' # Sometimes ETH is net_type for ETH? or just currency=ETH net_type=ETH?
    ]

    for i, currency in enumerate(sorted(currencies)):
        if consecutive_auth_errors >= MAX_AUTH_ERRORS:
            print("\n[!] Stopping due to consecutive authentication errors.")
            print("[!] Please check your API keys in keys.json.")
            break

        print(f"Processing {currency} ({i+1}/{len(currencies)})...")
        time.sleep(0.1) # Base rate limiting

        # Networks to try for this currency
        networks_to_try = [currency] + COMMON_NETWORKS
        # Remove duplicates while preserving order
        networks_to_try = list(dict.fromkeys(networks_to_try))

        found_for_currency = False
        
        for net in networks_to_try:
            # Skip obviously wrong combos to save requests? 
            # E.g. don't try TRC20 for BTC if we know it doesn't support it? 
            # But we don't know the map. Bithumb might wrap BTC in ERC20? (WBTC?)
            # But usually 'currency'='BTC' implies native.
            
            # Optimization: If we already found a native address, maybe we don't need token networks?
            # User wants "ALL" (전부). So we should try meaningful ones.
            # But brute forcing 20 nets per coin = 8000 requests. 
            # We'll try to be fast but handling errors.
            
            # print(f"  > Checking {net}...")
            resp = None
            try:
                resp = client.generate_address(currency, net)
            except Exception as e:
                # If _request raises exception (it shouldn't, returns None/dict usually)
                pass

            if resp and 'deposit_address' in resp:
                addr_info = {
                    'currency': resp.get('currency', currency),
                    'net_type': resp.get('net_type', net),
                    'address': resp.get('deposit_address'),
                    'secondary_address': resp.get('secondary_address'),
                    'response_msg': 'Success'
                }
                results.append(addr_info)
                print(f"    -> Found {net}: {addr_info['address']}")
                found_for_currency = True
                
                # If we found it via 'currency' net_type, it's likely the main chain.
                # Should we continue? Yes, for multi-chain support.
                
            elif resp and 'error' in resp:
                err = resp['error']
                # Check for net_type error
                msg = err.get('message', '')
                if "net_type" in msg or "value" in msg:
                    # Invalid net_type for this currency
                    pass
                elif "invalid_jwt" in msg or "unauthorized" in msg.lower():
                    print(f"    [!] Auth Error: {msg}")
                    consecutive_auth_errors += 1
                    if consecutive_auth_errors >= MAX_AUTH_ERRORS:
                        break
                else:
                    # Other error (e.g. rate limit)
                   pass
            
            # Small delay between network attempts for same currency
            # time.sleep(0.05) 
        
        if not found_for_currency:
             results.append({
                'currency': currency,
                'net_type': 'Unknown',
                'address': None,
                'secondary_address': None,
                'response_msg': 'No valid network found'
            })
        else:
            # Reset consecutive errors if we succeeded
            consecutive_auth_errors = 0
            
        # Determine if we should pause more
        if i % 10 == 0:
            time.sleep(0.5)

    # Convert to DataFrame and save
    df = pd.DataFrame(results)
    df.to_csv('bithumb_deposit_addresses_bruteforce.csv', index=False)
    print("Done. Saved to bithumb_deposit_addresses_bruteforce.csv")

if __name__ == "__main__":
    main()
