import requests
import json
import time

def main():
    # Only fetch coin info to debug chain names
    url = "https://api.bybit.com/v5/asset/coin/query-info?coin=USDT"
    resp = requests.get(url).json()
    print(json.dumps(resp, indent=2))

if __name__ == "__main__":
    main()
