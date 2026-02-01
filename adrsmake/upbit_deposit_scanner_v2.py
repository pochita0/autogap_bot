import jwt
import uuid
import hashlib
import time
import requests
import csv
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
        return jwt.encode(payload, self.secret_key, algorithm='HS256')

    def _request(self, method, endpoint, params=None):
        url = self.server_url + endpoint
        token = self._get_token(params)
        headers = {'Authorization': f'Bearer {token}'}
        try:
            if method == 'GET':
                resp = requests.get(url, params=params, headers=headers)
            else:
                resp = requests.post(url, json=params, headers=headers)
            return resp.json()
        except Exception as e:
            print(f"  [ERROR] Request failed: {e}")
            return None

    def get_wallet_status(self):
        return self._request('GET', '/v1/status/wallet')

    def get_deposit_addresses(self):
        return self._request('GET', '/v1/deposits/coin_addresses')

    def generate_coin_address(self, currency, net_type=None):
        params = {'currency': currency}
        if net_type:
            params['net_type'] = net_type
        return self._request('POST', '/v1/deposits/generate_coin_address', params)


def main():
    keys = load_keys('keys.json')
    if not keys:
        print("keys.json 파일을 찾을 수 없습니다.")
        return

    api_key = keys.get('UPBIT_API_KEY')
    secret_key = keys.get('UPBIT_API_SECRET')
    if not api_key or not secret_key:
        print("Upbit API 키가 없습니다.")
        return

    client = UpbitClient(api_key, secret_key)

    # Step 1: 전체 코인/네트워크 목록 가져오기
    print("=" * 60)
    print("[1/5] 업비트 지갑 상태 조회 중 (전체 코인/네트워크)...")
    print("=" * 60)
    wallet_status = client.get_wallet_status()

    if not isinstance(wallet_status, list):
        print(f"지갑 상태 조회 실패: {wallet_status}")
        return

    print(f"총 {len(wallet_status)}개 코인/네트워크 조합 발견\n")

    # Step 2: 기존 생성된 주소 조회
    print("=" * 60)
    print("[2/5] 기존 입금 주소 조회 중...")
    print("=" * 60)
    existing = client.get_deposit_addresses()

    existing_set = set()
    if isinstance(existing, list):
        for item in existing:
            key = (item.get('currency', ''), item.get('net_type', ''))
            existing_set.add(key)
        print(f"기존 주소 {len(existing)}개 확인됨\n")
    else:
        print(f"기존 주소 조회 오류: {existing}")
        existing = []

    # Step 3: 없는 주소 생성 요청
    print("=" * 60)
    print("[3/5] 누락된 입금 주소 생성 중...")
    print("=" * 60)

    gen_count = 0
    skip_count = 0
    fail_count = 0
    total = len(wallet_status)

    for i, wallet in enumerate(wallet_status):
        currency = wallet.get('currency', '')
        net_type = wallet.get('net_type', '')
        wallet_state = wallet.get('wallet_state', '')

        # 비활성 지갑 스킵
        if wallet_state in ('unsupported', 'inactive'):
            skip_count += 1
            continue

        key = (currency, net_type)
        if key in existing_set:
            skip_count += 1
            continue

        print(f"  [{i+1}/{total}] {currency}/{net_type} 생성 요청...")
        resp = client.generate_coin_address(currency, net_type if net_type else None)

        if isinstance(resp, dict):
            if resp.get('success') or resp.get('deposit_address'):
                gen_count += 1
                print(f"    -> 성공")
            elif resp.get('error'):
                err = resp['error']
                msg = err.get('message', err.get('name', 'unknown'))
                print(f"    -> 실패: {msg}")
                fail_count += 1
            else:
                gen_count += 1
                print(f"    -> 요청 완료")
        else:
            print(f"    -> 오류: {resp}")
            fail_count += 1

        time.sleep(0.15)

    print(f"\n생성 요청 완료: 성공 {gen_count}, 스킵 {skip_count}, 실패 {fail_count}")

    # Step 4: 비동기 생성 대기 후 재조회
    if gen_count > 0:
        wait_sec = 15
        print(f"\n{'=' * 60}")
        print(f"[4/5] 주소 생성 대기 중 ({wait_sec}초)...")
        print("=" * 60)
        time.sleep(wait_sec)
    else:
        print(f"\n{'=' * 60}")
        print("[4/5] 새 생성 없음, 바로 조회...")
        print("=" * 60)

    print("전체 입금 주소 재조회 중...")
    final_addresses = client.get_deposit_addresses()

    if not isinstance(final_addresses, list):
        print(f"최종 조회 실패: {final_addresses}")
        return

    print(f"총 {len(final_addresses)}개 주소 조회 완료\n")

    # Step 5: CSV 저장
    print("=" * 60)
    print("[5/5] CSV 저장 중...")
    print("=" * 60)

    sorted_addrs = sorted(final_addresses, key=lambda x: x.get('currency', ''))

    with open('upbit_deposit_addresses.csv', 'w', newline='') as f:
        writer = csv.writer(f)
        writer.writerow(['currency', 'net_type', 'deposit_address', 'secondary_address'])
        for addr in sorted_addrs:
            writer.writerow([
                addr.get('currency', ''),
                addr.get('net_type', ''),
                addr.get('deposit_address', ''),
                addr.get('secondary_address', '')
            ])

    print(f"upbit_deposit_addresses.csv 에 {len(final_addresses)}개 주소 저장 완료")
    print("\n완료!")


if __name__ == "__main__":
    main()
