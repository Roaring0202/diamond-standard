# Instruction

## Objective
* Create a `upgradable`, `pausable` __defiavgprice__ smart contract which can be used to calculate the average token price of a token.

Example: Suppose, the token price is stored on-chain everyday.

> NOTE: 
> 1. You can't use any loops for adding prices like `for`, `while`, etc.
> 2. You have full freedom to decide the data structure of the contract for efficient gas consumption.
> 3. Follow GMT timestamp as day timezone for precision.

## Features
* Set price for a day.
* View price on a day.
* View average token price from _Aug_ to _Sept_ out of 1 year data (_Jan_-_Dec_).

## Deployment
Before every iteration, the code has to updated & deployed in the same address with no change in the storage variables.

### Iteration-1
* Anyone can set everyday price

### Iteration-2
* Only Owner can set everyday price

### Iteration-3
* The price for a day can be set on the same day.

E.g. The price for Jan 1st can be set on Jan 1st as per GMT timezone. 


## Dependencies
* OpenZeppelin
* Slither for finding SC vulnerabilities

## Testing framework
* Hardhat using Typescript language.
* Include console based log inside the contract so that it is helpful for debugging.

## Networks
* localhost
* Testnet
	- Rinkeby
	- Kovan
* Mainnet
	- Ethereum

## Examine
* Efficient code in terms of gas consumption
* Secure code: shouldn't have defi hack bugs in the contract code.
* Production code i.e use variable names by format which is used in the production codebase.
* Use solidity [NATSPEC](https://docs.soliditylang.org/en/latest/style-guide.html#natspec)

## Glossary
* SC: Smart Contract