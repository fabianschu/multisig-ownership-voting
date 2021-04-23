# Coding Challenge: Ballot

## Run it

Install dependencies: `yarn`

Run tests: `yarn test`

Coverage: `yarn coverage`

## Goal

  - build a voting app 
  - eligible to vote are the stakers of a specific balancer pool 
  - these stakers have voting rights proportionate to their stakes in the balancer pool
  - they can vote on adding/removing Owners to/from a Gnosis safe (= multisig contract)

## Specifications

  - to avoid double voting (that is using the same LP tokens to vote for the same proposal multiple times) LP token holders must stake their LP tokens to be able to propose or vote
  - if they unstake their tokens, all outstanding votes are erased
  - for a proposal to be accepted, the number of votes for the proposal must be larger than 50% of the total supply of LP tokens
  - the threshold for the Gnosis Safe (that is the number of signatures necessary to execute transactions) is handled by the voting app
  - the voting app takes care that this threshold is always set to the smallest possible majority (e.g. if there are 5 owners of the multisig the threshold will be 3 and if there are 2 owners the threshold will be 2)

## Structure

  - the project consists of the voting app contract **Ballot**, the **OwnerManager** contract of the *Gnosis Safe*, a balancer pool contract **BPool** and two test token contracts **TToken**
  - **Ballot** inherits from **OwnerManager** and takes that ownership is managed through votes
  - there are also some slight modifications to the original **OwnerManager** module:
    - adding and removing owners is only possible through internal function calls (-> **Ballot**) and not by multisig owners
    - initially the deployer is set as first multisig owner in the constructor (see potential improvements)
    - swapping owners is not possible anymore

## Some potential Improvements
  - Enable deployment without initial multisig owner
  - Allow partial staking of LP tokens (currently it is all or nothing)
