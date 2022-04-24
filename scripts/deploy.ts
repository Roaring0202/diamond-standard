// We require the Hardhat Runtime Environment explicitly here. This is optional
// but useful for running the script in a standalone fashion through `node <script>`.
//
// When running the script with `npx hardhat run <script>` you'll find the Hardhat
// Runtime Environment's members available in the global scope.
import { ethers } from "hardhat";
import { getSelectorsFromContract, FacetCutAction } from "./libraries";

export async function deployDiamond() {
  // Hardhat always runs the compile task when running scripts with its command
  // line interface.
  //
  // If this script is run directly using `node` you may want to call compile
  // manually to make sure everything is compiled
  // await hre.run('compile');
  // We get the contract to deploy

  console.log("**** Deploying diamond ...");

  const accounts = await ethers.getSigners();
  const owner = accounts[0];

  // deploy DiamondCutFacet
  const DiamondCutFacet = await ethers.getContractFactory("DiamondCutFacet");
  const diamondCutFacet = await DiamondCutFacet.deploy();
  await diamondCutFacet.deployed();

  console.log("DiamondCutFacet deployed at: ", diamondCutFacet.address);

  // deploy Diamond
  const Diamond = await ethers.getContractFactory("Diamond");
  const diamond = await Diamond.deploy(owner.address, diamondCutFacet.address);
  await diamond.deployed();

  console.log("Diamond deployed at: ", diamond.address);

  // deploy DiamondInit
  const DiamondInit = await ethers.getContractFactory("DiamondInit");
  const diamondInit = await DiamondInit.deploy();
  await diamondInit.deployed();

  console.log("DiamondInit deployed at: ", diamondInit.address);

  // deploy facets
  // console.log("Deploying facets");
  const FacetNames = [
    "DiamondLoupeFacet",
    /* "OwnershipFacet", */
    "TokenAvgPriceV1",
  ];
  const cut = [];
  for (const facetName of FacetNames) {
    const Facet = await ethers.getContractFactory(facetName);
    const facet = await Facet.deploy();
    await facet.deployed();

    console.log(`${facetName} deployed at ${facet.address}`);

    const selectors = getSelectorsFromContract(facet);
    cut.push({
      facetAddress: facet.address,
      action: FacetCutAction.Add,
      functionSelectors: selectors.getSelectors(),
    });
  }

  // console.log("Diamond Cut: ", cut);
  const diamondCut = await ethers.getContractAt("IDiamondCut", diamond.address);
  const functionCall = diamondInit.interface.encodeFunctionData("init");
  const tx = await diamondCut.diamondCut(
    cut,
    diamondInit.address,
    functionCall
  );
  // console.log("Diamond cut tx: ", tx.hash);
  const receipt = await tx.wait();
  // console.log("returned status: ", receipt);
  if (!receipt.status) throw Error(`Diamond upgrade failed: ${tx.hash}`);

  // Set owner address of TokenAvgPrice contract
  diamond.setMainContractOwner(ethers.utils.getAddress(owner.address));

  console.log("**** Diamond deploy end");
  return diamond.address;
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
if (require.main === module) {
  deployDiamond()
    .then(() => console.log("deployment success"))
    .catch((error) => {
      console.error(error);
    });
}
