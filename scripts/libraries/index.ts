/* eslint-disable prettier/prettier */
import { Contract } from "ethers";
import { ethers } from "hardhat";

export const FacetCutAction = {
  Add: 0,
  Replace: 1,
  Remove: 2,
};

interface Facet {
  facetAddress: string;
  facetName: string;
}

class SelectorList {
  selectors: string[];
  contract: Contract;
  constructor(contract: Contract, selectors: string[] = []) {
    this.selectors = selectors;
    this.contract = contract;
  }

  remove(functionNames: string[]) {
    this.selectors = this.selectors.filter((v: string) => {
      for (const functionName of functionNames)
        if (v === this.contract.interface.getSighash(functionName))
          return false;
      return true;
    });
  }

  get(functionNames: string[]) {
    return this.selectors.filter((v: string) => {
      for (const functionName of functionNames)
        if (v === this.contract.interface.getSighash(functionName)) return true;
      return false;
    });
  }

  getSelectors() {
    return this.selectors;
  }
}

export function getSelectorsFromContract(contract: Contract) {
  const signatures = Object.keys(contract.interface.functions);
  const selectors = signatures.reduce((acc: any[], val: string) => {
    if (val !== "init(bytes)") acc.push(contract.interface.getSighash(val));
    return acc;
  }, []);
  return new SelectorList(contract, selectors);
}

// get function selector from function signature
export function getSelector(func: string) {
  const abiInterface = new ethers.utils.Interface([func]);
  return abiInterface.getSighash(ethers.utils.Fragment.from(func));
}

export function findAddressPositionInFacets(
  facetAddress: string,
  facets: Facet[]
) {
  for (let i = 0; i < facets.length; ++i)
    if (facets[i].facetAddress === facetAddress) return i;
}
