import { BigNumber } from "@ethersproject/bignumber";
import { getAddress } from "@ethersproject/address";

import { Address, Service } from "../common";
import { Balance, BalancesMap, GasPrice, Token } from "../types";
import { EthAddress, handleHttpError, Usdc, ZeroAddress } from "../helpers";

/**
 * [[ZapperService]] interacts with the zapper api to gather more insight for
 * tokens and user positions.
 */
export class ZapperService extends Service {
  async supportedTokens(): Promise<Token[]> {
    const url = "https://api.zapper.fi/v1/prices";
    const params = new URLSearchParams({ api_key: this.ctx.zapper });
    const tokens = await fetch(`${url}?${params}`)
      .then(handleHttpError)
      .then(res => res.json());
    return tokens.map(
      (token: Record<string, string>): Token => ({
        id: token.address,
        name: token.symbol,
        symbol: token.symbol,
        decimals: BigNumber.from(token.decimals),
        price: Usdc(token.price),
        supported: { zapper: true }
      })
    );
  }

  async balances<T extends Address>(address: T): Promise<Balance[]>;
  async balances<T extends Address>(addresses: T[]): Promise<BalancesMap<T>>;
  async balances<T extends Address>(
    addresses: T[] | T
  ): Promise<BalancesMap<T> | Balance[]>;

  async balances<T extends Address>(
    addresses: T[] | T
  ): Promise<BalancesMap<T> | Balance[]> {
    const url = "https://api.zapper.fi/v1/balances/tokens";
    const params = new URLSearchParams({
      "addresses[]": Array.isArray(addresses) ? addresses.join() : addresses,
      api_key: this.ctx.zapper
    });
    const balances = await fetch(`${url}?${params}`)
      .then(handleHttpError)
      .then(res => res.json());
    Object.keys(balances).forEach(address => {
      const copy = balances[address];
      delete balances[address];
      balances[getAddress(address)] = copy.map(
        (balance: Record<string, unknown>) => {
          const address =
            balance.address === ZeroAddress
              ? EthAddress
              : getAddress(String(balance.address));
          return {
            address,
            token: {
              id: address,
              name: balance.symbol,
              symbol: balance.symbol,
              decimals: BigNumber.from(balance.decimals)
            },
            balance: BigNumber.from(balance.balanceRaw),
            balanceUsdc: Usdc(balance.balanceUSD),
            price: Usdc(balance.price)
          };
        }
      );
    });
    if (!Array.isArray(addresses)) return balances[addresses];
    return balances;
  }

  async gas(): Promise<GasPrice[]> {
    const url = "https://api.zapper.fi/v1/gas-price";
    const params = new URLSearchParams({
      api_key: this.ctx.zapper
    });
    const gas = await fetch(`${url}?${params}`)
      .then(handleHttpError)
      .then(res => res.json());
    return gas;
  }
}
