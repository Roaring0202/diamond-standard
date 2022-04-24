import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { assert, expect } from "chai";
import { BigNumber, Contract } from "ethers";
import { ethers } from "hardhat";
import { deployDiamond } from "../scripts/deploy";
import { FacetCutAction, getSelectorsFromContract } from "../scripts/libraries";
import {
  DiamondCutFacet,
  DiamondLoupeFacet,
  TokenAvgPriceV1,
  TokenAvgPriceV2,
  TokenAvgPriceV3,
} from "../typechain";
// const daysOfMonth = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
const getTimeStamp = (year: number, month: number, day: number) => {
  return new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0)).valueOf() / 1000;
};

describe("Test", () => {
  let diamondAddress: string;
  let diamondCutFacet: Contract | DiamondCutFacet;
  let diamondLoupeFacet: Contract | DiamondLoupeFacet;
  let tokenAvgPrice: Contract | TokenAvgPriceV1;
  let tokenAvgPriceV2: Contract | TokenAvgPriceV2;
  let tokenAvgPriceV3: Contract | TokenAvgPriceV3;
  let facetAddresses: string[]; // DiamondCutFacet, DiamondLoupeFacet, TokenAvgPriceV1
  let owner: string;
  let accounts: SignerWithAddress[];

  before(async () => {
    // deploy contracts
    diamondAddress = await deployDiamond();
    diamondCutFacet = await ethers.getContractAt(
      "DiamondCutFacet",
      diamondAddress
    );
    diamondLoupeFacet = await ethers.getContractAt(
      "DiamondLoupeFacet",
      diamondAddress
    );
    tokenAvgPrice = await ethers.getContractAt(
      "TokenAvgPriceV1",
      diamondAddress
    );
    accounts = await ethers.getSigners();
    owner = accounts[0].address;
  });

  describe("test - diamond", () => {
    it("should have 3 facets -- call to facetAddresses", async () => {
      facetAddresses = await diamondLoupeFacet.facetAddresses();
      assert(facetAddresses.length === 3);
    });

    it("should have the right function selectors -- call to faceFunctionSelectors", async () => {
      let selectors, result;
      // test for DiamondCutFacet
      selectors = getSelectorsFromContract(diamondCutFacet).getSelectors();
      result = await diamondLoupeFacet.facetFunctionSelectors(
        facetAddresses[0]
      );
      assert.sameMembers(result, selectors);
      // console.log("--- selectors ---");
      // console.log(selectors);

      // test for DiamondLoupeFacet
      selectors = getSelectorsFromContract(diamondLoupeFacet).getSelectors();
      result = await diamondLoupeFacet.facetFunctionSelectors(
        facetAddresses[1]
      );
      assert.sameMembers(result, selectors);
      // console.log("--- selectors ---");
      // console.log(selectors);

      // test for TokenAvgPriceV1
      selectors = getSelectorsFromContract(tokenAvgPrice).getSelectors();
      result = await diamondLoupeFacet.facetFunctionSelectors(
        facetAddresses[2]
      );
      assert.sameMembers(result, selectors);
      // console.log("--- selectors ---");
      // console.log(selectors);
    });
    it("owner of the contract", async () => {
      console.log("trying to call the owner method");
      const contractOwner = await tokenAvgPrice.owner();
      console.log("contractOwner: ", contractOwner);
      assert(contractOwner === owner);
    });
  });

  describe("test - set day price", () => {
    it("should revert with invalid timestamp", async () => {
      const invalidTimestamp = 1234567890;
      await expect(
        tokenAvgPrice.setDayPrice(invalidTimestamp, BigNumber.from(111))
      ).to.be.reverted;
    });
    it("should revert when price of the day is already set", async () => {
      await tokenAvgPrice.setDayPrice(
        getTimeStamp(2022, 3, 31),
        BigNumber.from(222)
      );
      await expect(
        tokenAvgPrice.setDayPrice(
          getTimeStamp(2022, 3, 31),
          BigNumber.from(222)
        )
      ).to.be.reverted;
    });
    it("should set the price of the day exactly 1 day after the last record", async () => {
      await tokenAvgPrice.setDayPrice(
        getTimeStamp(2022, 4, 1),
        BigNumber.from(222)
      );
      await expect(
        tokenAvgPrice.setDayPrice(
          getTimeStamp(2022, 3, 26),
          BigNumber.from(222)
        )
      ).to.be.reverted;
    });
  });
  describe("test - main logic", () => {
    it("test getDayPrice", async () => {
      const price = 1000;
      await tokenAvgPrice.setDayPrice(getTimeStamp(2022, 4, 2), price);
      const priceReturned = await tokenAvgPrice.getDayPrice(
        getTimeStamp(2022, 4, 2)
      );
      assert.equal(priceReturned.toNumber(), price);
    });
    it("test getAveragePrice - one day", async () => {
      const date = getTimeStamp(2022, 3, 31);
      const price = (await tokenAvgPrice.getDayPrice(date)).toNumber();
      const avgPrice = (
        await tokenAvgPrice.getAveragePrice(date, date)
      ).toNumber();
      assert.equal(price, avgPrice);
    });
    it("test getAveragePrice - two days", async () => {
      const price1 = (
        await tokenAvgPrice.getDayPrice(getTimeStamp(2022, 3, 31))
      ).toNumber();
      const price2 = (
        await tokenAvgPrice.getDayPrice(getTimeStamp(2022, 4, 1))
      ).toNumber();
      const avgPrice = (
        await tokenAvgPrice.getAveragePrice(
          getTimeStamp(2022, 3, 31),
          getTimeStamp(2022, 4, 1)
        )
      ).toNumber();
      assert.equal((price1 + price2) / 2, avgPrice);
    });
    it("test getAveragePrice-one month", async () => {
      for (let day = 3; day <= 30; ++day) {
        tokenAvgPrice.setDayPrice(getTimeStamp(2022, 4, day), 1000);
      }
      let avg = 0;
      for (let day = 1; day <= 30; ++day) {
        const price = (
          await tokenAvgPrice.getDayPrice(getTimeStamp(2022, 4, day))
        ).toNumber();
        avg += price;
      }
      avg = Math.floor(avg / 30);
      const avgReturned = (
        await tokenAvgPrice.getAveragePrice(
          getTimeStamp(2022, 4, 1),
          getTimeStamp(2022, 4, 30)
        )
      ).toNumber();
      assert.equal(avg, avgReturned);
    });
  });
  describe("test version 2", () => {
    it("test - upgrade to version 2", async () => {
      // console.log("before deploying version 2: ", facetAddresses);

      const TokenAvgPriceV2 = await ethers.getContractFactory(
        "TokenAvgPriceV2"
      );
      tokenAvgPriceV2 = await TokenAvgPriceV2.deploy();
      await tokenAvgPriceV2.deployed();

      console.log("version 2 deployed at: ", tokenAvgPriceV2.address);
      const cut = [
        {
          facetAddress: ethers.constants.AddressZero,
          action: FacetCutAction.Remove,
          functionSelectors:
            getSelectorsFromContract(tokenAvgPrice).getSelectors(),
        },
        {
          facetAddress: tokenAvgPriceV2.address,
          action: FacetCutAction.Add,
          functionSelectors:
            getSelectorsFromContract(tokenAvgPriceV2).getSelectors(),
        },
      ];

      const timeStampBeforeUpgrade = (
        await tokenAvgPrice.getLastTimestamp()
      ).toNumber();

      const tx = await diamondCutFacet.diamondCut(
        cut,
        ethers.constants.AddressZero,
        "0x"
      );
      const receipt = await tx.wait();
      if (!receipt.status) {
        throw Error(`Diamond upgrade failed: ${tx.hash}`);
      }

      tokenAvgPriceV2 = await ethers.getContractAt(
        "TokenAvgPriceV2",
        diamondAddress
      );

      const timeStampAfterUpgrade = (
        await tokenAvgPriceV2.getLastTimestamp()
      ).toNumber();
      assert.equal(timeStampAfterUpgrade, timeStampBeforeUpgrade);
    });
    it("test - only owner can set daily price data", async () => {
      const currentOwner = await tokenAvgPriceV2.owner();
      console.log("current owner: ", currentOwner);
      assert.equal(currentOwner, owner);

      await expect(
        tokenAvgPriceV2
          .connect(accounts[1])
          .setDayPrice(getTimeStamp(2022, 5, 1), 1000)
      ).to.be.reverted;

      await tokenAvgPriceV2.transferOwnership(accounts[1].address);

      // console.log("new owner: ", await tokenAvgPriceV2.owner());

      await expect(
        tokenAvgPriceV2
          .connect(accounts[0])
          .setDayPrice(getTimeStamp(2022, 5, 1), 1000)
      ).to.be.reverted;

      await tokenAvgPriceV2
        .connect(accounts[1])
        .setDayPrice(getTimeStamp(2022, 5, 1), 1000);

      const price = (
        await tokenAvgPriceV2.getDayPrice(getTimeStamp(2022, 5, 1))
      ).toNumber();
      assert.equal(price, 1000);

      // console.log("reset owner to origianl owner");
      await tokenAvgPriceV2.connect(accounts[1]).transferOwnership(owner);
    });
  });
  describe("test version 3", () => {
    it("test - upgrade to version 3", async () => {
      // console.log("before deploying version 2: ", facetAddresses);

      const TokenAvgPriceV3 = await ethers.getContractFactory(
        "TokenAvgPriceV3"
      );
      tokenAvgPriceV3 = await TokenAvgPriceV3.deploy();
      await tokenAvgPriceV3.deployed();

      console.log("version 3 deployed at: ", tokenAvgPriceV2.address);
      const cut = [
        {
          facetAddress: ethers.constants.AddressZero,
          action: FacetCutAction.Remove,
          functionSelectors:
            getSelectorsFromContract(tokenAvgPriceV2).getSelectors(),
        },
        {
          facetAddress: tokenAvgPriceV3.address,
          action: FacetCutAction.Add,
          functionSelectors:
            getSelectorsFromContract(tokenAvgPriceV3).getSelectors(),
        },
      ];
      const tx = await diamondCutFacet.diamondCut(
        cut,
        ethers.constants.AddressZero,
        []
      );
      const receipt = await tx.wait();
      if (!receipt.status) {
        throw Error(`Diamond upgrade failed: ${tx.hash}`);
      }
      tokenAvgPriceV3 = await ethers.getContractAt(
        "TokenAvgPriceV3",
        diamondAddress
      );
    });
    it("test - setting price for other day, should fail", async () => {
      // set day price for 2022/5/2 on 2022/5/1. should fail
      await ethers.provider.send("evm_setNextBlockTimestamp", [
        getTimeStamp(2022, 5, 1) + 32320,
      ]);
      await expect(tokenAvgPriceV3.setDayPrice(getTimeStamp(2022, 5, 2), 100))
        .to.be.reverted;
    });
  });
});
