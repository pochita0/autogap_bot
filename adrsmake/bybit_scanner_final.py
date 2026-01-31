#!/usr/bin/env python3
"""
Fetch ALL deposit addresses (all coins + all chains) for a Bybit MASTER account (V5).

Flow:
1) GET /v5/asset/coin/query-info  -> discover all coins + their chains (and deposit status)
2) For each coin:
   GET /v5/asset/deposit/query-address?coin=COIN  -> returns chains[] with addressDeposit/tagDeposit/chainType/chain
3) Join (coin, chain) with coin-info for deposit/withdraw status and metadata
4) Export JSON and/or CSV

Docs:
- coin info:     GET /v5/asset/coin/query-info
- deposit addr:  GET /v5/asset/deposit/query-address?coin=...
- signature (GET): timestamp + api_key + recv_window + queryString (HMAC-SHA256 -> lowercase hex)
"""

from __future__ import annotations

import argparse
import csv
import hashlib
import hmac
import json
import os
import sys
import time
from dataclasses import dataclass
from typing import Any, Dict, List, Optional, Tuple
from urllib.parse import urlencode, quote

import requests


@dataclass
class BybitAuth:
    api_key: str
    api_secret: str
    recv_window: str = "5000"  # milliseconds


class BybitV5Client:
    def __init__(self, base_url: str, auth: BybitAuth, timeout: int = 15):
        self.base_url = base_url.rstrip("/")
        self.auth = auth
        self.sess = requests.Session()
        self.timeout = timeout

    @staticmethod
    def _now_ms() -> str:
        return str(int(time.time() * 1000))

    def _sign_get(self, timestamp_ms: str, query_string: str) -> str:
        """
        HMAC_SHA256(secret, timestamp + api_key + recv_window + queryString) -> lowercase hex
        """
        prehash = f"{timestamp_ms}{self.auth.api_key}{self.auth.recv_window}{query_string}"
        sig = hmac.new(
            self.auth.api_secret.encode("utf-8"),
            prehash.encode("utf-8"),
            hashlib.sha256,
        ).hexdigest()
        return sig.lower()

    def _headers(self, timestamp_ms: str, signature: str) -> Dict[str, str]:
        # Many Bybit V5 examples include X-BAPI-SIGN-TYPE: 2; harmless to include.
        return {
            "X-BAPI-API-KEY": self.auth.api_key,
            "X-BAPI-TIMESTAMP": timestamp_ms,
            "X-BAPI-RECV-WINDOW": self.auth.recv_window,
            "X-BAPI-SIGN": signature,
            "X-BAPI-SIGN-TYPE": "2",
            "Content-Type": "application/json",
        }

    def _request_get(self, path: str, params: Optional[Dict[str, Any]] = None, max_retries: int = 8) -> Dict[str, Any]:
        """
        Signed GET with simple rate-limit/backoff handling.
        If retCode == 10006, we back off using X-Bapi-Limit-Reset-Timestamp when possible.
        """
        params = params or {}

        # Deterministic query string; must match what we send in URL.
        query_string = urlencode(params, doseq=True, quote_via=quote)
        url = f"{self.base_url}{path}"
        if query_string:
            url = f"{url}?{query_string}"

        for attempt in range(max_retries):
            ts = self._now_ms()
            sig = self._sign_get(ts, query_string)
            headers = self._headers(ts, sig)

            resp = self.sess.get(url, headers=headers, timeout=self.timeout)
            # If you want to use Bybit rate limit headers proactively:
            # X-Bapi-Limit-Status, X-Bapi-Limit, X-Bapi-Limit-Reset-Timestamp
            reset_ts = resp.headers.get("X-Bapi-Limit-Reset-Timestamp")
            limit_status = resp.headers.get("X-Bapi-Limit-Status")

            try:
                data = resp.json()
            except Exception:
                raise RuntimeError(f"Non-JSON response {resp.status_code}: {resp.text[:200]}")

            ret_code = data.get("retCode")
            if ret_code == 0:
                return data

            # Rate limit hit
            if ret_code == 10006:
                sleep_s = 1.0
                if reset_ts:
                    try:
                        now_ms = int(time.time() * 1000)
                        reset_ms = int(reset_ts)
                        # reset_ts can be "current timestamp" when not exceeded; still safe.
                        sleep_s = max(0.5, (reset_ms - now_ms) / 1000.0 + 0.2)
                    except ValueError:
                        pass
                else:
                    # fallback exponential backoff
                    sleep_s = min(8.0, 0.8 * (2 ** attempt))
                time.sleep(sleep_s)
                continue

            # Timestamp or auth issues -> small backoff, then retry
            # (Bybit requires timestamp within server_time - recv_window <= ts < server_time + 1000)
            if ret_code in (10002, 10003, 10004, 10005):
                time.sleep(min(2.0, 0.4 * (2 ** attempt)))
                continue

            # Other errors: break early but keep message
            raise RuntimeError(f"Bybit error retCode={ret_code}, retMsg={data.get('retMsg')}, url={url}")

        raise RuntimeError(f"Failed after retries: {url}")

    def get_coin_info_all(self) -> List[Dict[str, Any]]:
        data = self._request_get("/v5/asset/coin/query-info", params={})
        rows = (data.get("result") or {}).get("rows") or []
        return rows

    def get_master_deposit_addresses(self, coin: str) -> Dict[str, Any]:
        data = self._request_get("/v5/asset/deposit/query-address", params={"coin": coin})
        return (data.get("result") or {})


def build_coin_chain_index(coin_rows: List[Dict[str, Any]]) -> Dict[Tuple[str, str], Dict[str, Any]]:
    """
    Index coin-info by (coin, chain).
    coin-info contains chains[] with:
      chain, chainType, chainDeposit, chainWithdraw, confirmation, depositMin, withdrawMin, contractAddress, ...
    """
    idx: Dict[Tuple[str, str], Dict[str, Any]] = {}
    for row in coin_rows:
        coin = row.get("coin") or row.get("name")
        if not coin:
            continue
        for ch in row.get("chains") or []:
            chain = ch.get("chain")
            if not chain:
                continue
            idx[(coin, chain)] = ch
    return idx


def export_json(path: str, records: List[Dict[str, Any]]) -> None:
    with open(path, "w", encoding="utf-8") as f:
        json.dump(records, f, ensure_ascii=False, indent=2)


def export_csv(path: str, records: List[Dict[str, Any]]) -> None:
    # Flatten keys we care about
    fieldnames = [
        "coin",
        "chain",
        "chainType",
        "addressDeposit",
        "tagDeposit",
        "batchReleaseLimit",
        "deposit_contractAddress_last6",
        "coininfo_contractAddress_full",
        "chainDeposit",
        "chainWithdraw",
        "confirmation",
        "safeConfirmNumber",
        "depositMin",
        "withdrawMin",
        "minAccuracy",
        "withdrawFee",
        "withdrawPercentageFee",
    ]
    with open(path, "w", encoding="utf-8", newline="") as f:
        w = csv.DictWriter(f, fieldnames=fieldnames)
        w.writeheader()
        for r in records:
            w.writerow({k: r.get(k, "") for k in fieldnames})


def main() -> int:
    p = argparse.ArgumentParser(description="Fetch Bybit MASTER deposit addresses for all coins/chains (V5).")
    p.add_argument("--base-url", default=os.getenv("BYBIT_BASE_URL", "https://api.bybit.com"))
    p.add_argument("--api-key", default=os.getenv("BYBIT_API_KEY"))
    p.add_argument("--api-secret", default=os.getenv("BYBIT_API_SECRET"))
    p.add_argument("--recv-window", default=os.getenv("BYBIT_RECV_WINDOW", "5000"))
    p.add_argument("--out-json", default="bybit_deposit_addresses.json")
    p.add_argument("--out-csv", default="bybit_deposit_addresses.csv")
    p.add_argument("--no-csv", action="store_true", help="Do not write CSV")
    p.add_argument("--no-json", action="store_true", help="Do not write JSON")
    p.add_argument("--include-suspended", action="store_true",
                   help="Include chains where coin-info chainDeposit=0 (suspended). Default: exclude.")
    p.add_argument("--sleep", type=float, default=0.05,
                   help="Base sleep between coin requests (seconds). Keep small; rate limits still apply.")
    args = p.parse_args()

    if not args.api_key or not args.api_secret:
        print("ERROR: Set BYBIT_API_KEY and BYBIT_API_SECRET env vars (or pass --api-key/--api-secret).", file=sys.stderr)
        return 2

    client = BybitV5Client(
        base_url=args.base_url,
        auth=BybitAuth(api_key=args.api_key, api_secret=args.api_secret, recv_window=str(args.recv_window)),
    )

    # 1) coin-info (all coins)
    coin_rows = client.get_coin_info_all()
    coin_chain_idx = build_coin_chain_index(coin_rows)

    # Build coin list
    coins = sorted({(r.get("coin") or r.get("name")) for r in coin_rows if (r.get("coin") or r.get("name"))})

    records: List[Dict[str, Any]] = []
    failures: List[Dict[str, str]] = []

    # 2) deposit addresses per coin
    for i, coin in enumerate(coins, start=1):
        try:
            result = client.get_master_deposit_addresses(coin=coin)
            chains = result.get("chains") or []
            if not chains:
                # No chains returned -> record as failure (some coins may not have deposit address)
                failures.append({"coin": coin, "error": "no chains returned"})
                time.sleep(args.sleep)
                continue

            for ch in chains:
                chain = ch.get("chain")  # e.g., ETH, TRX, etc.
                key = (coin, chain) if chain else None
                ci = coin_chain_idx.get(key) if key else None

                # Optional: exclude suspended deposit chains unless include-suspended
                if ci and (ci.get("chainDeposit") == "0" or ci.get("chainDeposit") == 0) and not args.include_suspended:
                    continue

                rec = {
                    "coin": coin,
                    "chain": chain or "",
                    "chainType": ch.get("chainType", ""),
                    "addressDeposit": ch.get("addressDeposit", ""),
                    "tagDeposit": ch.get("tagDeposit", ""),
                    "batchReleaseLimit": ch.get("batchReleaseLimit", ""),
                    "deposit_contractAddress_last6": ch.get("contractAddress", ""),

                    # Join from coin-info (if available)
                    "coininfo_contractAddress_full": (ci.get("contractAddress") if ci else "") or "",
                    "chainDeposit": (ci.get("chainDeposit") if ci else "") or "",
                    "chainWithdraw": (ci.get("chainWithdraw") if ci else "") or "",
                    "confirmation": (ci.get("confirmation") if ci else "") or "",
                    "safeConfirmNumber": (ci.get("safeConfirmNumber") if ci else "") or "",
                    "depositMin": (ci.get("depositMin") if ci else "") or "",
                    "withdrawMin": (ci.get("withdrawMin") if ci else "") or "",
                    "minAccuracy": (ci.get("minAccuracy") if ci else "") or "",
                    "withdrawFee": (ci.get("withdrawFee") if ci else "") or "",
                    "withdrawPercentageFee": (ci.get("withdrawPercentageFee") if ci else "") or "",
                }
                records.append(rec)

        except Exception as e:
            failures.append({"coin": coin, "error": str(e)})

        # gentle pacing (deposit/query-address is 300 req/min ~= 5 req/s)
        time.sleep(args.sleep)

        if i % 50 == 0:
            print(f"[{i}/{len(coins)}] collected records={len(records)} failures={len(failures)}", file=sys.stderr)

    # 3) write outputs
    if not args.no_json:
        export_json(args.out_json, records)
    if not args.no_csv:
        export_csv(args.out_csv, records)

    # Summary
    print(f"Done. records={len(records)} failures={len(failures)}")
    if failures:
        # Write failures to stderr (or you can export)
        print("Some coins failed / returned no chains. Example:", file=sys.stderr)
        for f in failures[:10]:
            print(f"  - {f['coin']}: {f['error']}", file=sys.stderr)

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
