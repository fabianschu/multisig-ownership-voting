// SPDX-License-Identifier: GPL-3.0
pragma solidity >=0.7.0 <0.9.0;

import "./OwnerManager.sol";
import "./IBPool.sol";
import "./interfaces/IERC20.sol";

contract Ballot is OwnerManager {

    enum ProposalType { addOwner, removeOwner }
    enum ProposalStatus { closed, open }

    struct Proposal {
        ProposalType proposalType;
        address owner;
        uint votes;
        ProposalStatus proposalStatus;
    }

    event ProposalAdded (uint index, uint proposalType, address target);

    modifier onlyStaker() {
        require(stakes[msg.sender] != 0, "B2");
        _;
    }

    modifier activeProposal(uint _index) {
        require(proposals[_index].owner != address(0), "B3");
        require(proposals[_index].proposalStatus == ProposalStatus.open, "B3");
        _;
    }

    IERC20 internal bPool;
    uint constant public MAX_INT = type(uint).max;    
    uint public numberProposals;
    mapping(address => uint) public stakes;
    mapping(address => uint[]) public votes;
    mapping(uint => Proposal) public proposals;

    constructor(address _bPool) {
        bPool = IERC20(_bPool);
    }

    /// @dev Allows to stake all liquidity provider (LP) tokens from the balancer pool.
    ///      Without staking voting/proposing is not possible.
    ///      This contract must have been approved with the balancer pool first.
    /// @notice Updates the caller's stakes.
    function stake() public {
        uint allowance = bPool.allowance(msg.sender, address(this));
        require(allowance == MAX_INT, "B1");

        uint stakerBalance = bPool.balanceOf(msg.sender);
        bPool.transferFrom(msg.sender, address(this), stakerBalance);
        stakes[msg.sender] = stakerBalance;
    }
    
    /// @dev Allows to unstake LP tokens.
    ///      Triggers removal of outstanding votes to avoid double voting.
    /// @notice Updates the caller's stakes. Removes caller's votes from open proposals.
    function unstake() public onlyStaker {
        bPool.transfer(msg.sender, stakes[msg.sender]);
        uint[] memory openVotes = votes[msg.sender];
        for (uint i = 0; i < openVotes.length; i++) {
            if (proposals[openVotes[i]].proposalStatus == ProposalStatus.open) {
                proposals[openVotes[i]].votes -= stakes[msg.sender];
            }
        }
        stakes[msg.sender] = 0;
        votes[msg.sender] = new uint[](0);
    }

    /// @dev Allows to add a new proposal about adding or removing owner.
    ///      The proposer automatically votes on her proposal.
    /// @notice Updates proposals. Updates the total number of proposals.
    function addProposal(uint _type, address _target) public onlyStaker {
        require(_target != address(0), "B4");
        Proposal memory proposal = Proposal(
            ProposalType(_type),
            _target,
            0,
            ProposalStatus.open
        );
    
        emit ProposalAdded(numberProposals, _type, _target);
        proposals[numberProposals] = proposal;
        vote(numberProposals);
        numberProposals++;
    }

    /// @dev Allows to vote on a proposal.
    ///      If majority is reached (votes > half of total supply of LP tokens) proposal is executed.
    /// @notice Updates votes on a proposal. Marks that voter has voted for a proposal (= update to votes)
    function vote(uint _index) public onlyStaker activeProposal(_index) {
        require(!hasAlreadyVoted(_index), "B5");

        proposals[_index].votes += stakes[msg.sender];
        if (isMajorityVote(_index)) {
            executeProposal(_index);
        } else {
            votes[msg.sender].push(_index);
        }
    }

    /// @dev Checks if voter has already voted on proposal.
    ///      If majority is reached (votes > half of total supply of LP tokens) proposal is executed.
    /// @return Returns true if attempted double vote.
    function hasAlreadyVoted(uint _index) internal view returns(bool) {
        for (uint i = 0; i < votes[msg.sender].length; i++) {
            if (votes[msg.sender][i] == _index) {
                return true;
            }
        }
        return false;
    }

    /// @dev Checks if a majority of LP token holders has voted for proposal.
    /// @return Returns true if majority is reached.
    function isMajorityVote(uint _index) public view returns(bool){
        uint total = bPool.totalSupply();
        return proposals[_index].votes * 2 > total;
    }

    /// @dev Adds or removes an owner as specified by the accepted proposal.
    ///      Is public to enable external triggering of execution.
    ///      This is important when majority ratios of Liquidity Pool have changed.
    ///      E.g. a major LP leaves the pool, so that a majority for a proposal is suddenly reached.
    /// @notice Sets the proposal status to closed.
    function executeProposal(uint _index) public {
        require(isMajorityVote(_index), "B6");

        uint newSafeThreshold = newMultiSigThreshold(proposals[_index].proposalType);
        address elected = proposals[_index].owner;
        if (proposals[_index].proposalType == ProposalType.addOwner) {
            addOwnerWithThreshold(elected, newSafeThreshold);
        } else {
            address[] memory currentOwners = getOwners();
            address prevOwner = SENTINEL_OWNERS;
            address owner;
            for (uint i; i < currentOwners.length; i++) {
                if (currentOwners[i] == proposals[_index].owner) {
                    owner = currentOwners[i];
                    if(i != 0) {
                        prevOwner = currentOwners[i - 1];
                    }
                }
            }
            removeOwner(prevOwner, owner, newSafeThreshold);
        }
        proposals[_index].proposalStatus = ProposalStatus.closed;
    }

    /// @dev Calculates the threshold for the multisig contract
    ///      Makes sure that the threshold is always just above 50%.
    /// @return The smallest possible majority threshold.
    function newMultiSigThreshold(ProposalType _proposalType) internal view returns(uint) {
        uint nextOwnerCount;
        uint nextThreshold = threshold;

        if (_proposalType == ProposalType.addOwner) {
            nextOwnerCount = ownerCount + 1;
            if (threshold * 2 <= nextOwnerCount) {
                nextThreshold++;
            }
        } else if (_proposalType == ProposalType.removeOwner) {
            nextOwnerCount = ownerCount - 1;
            if ((threshold - 1) * 2 > nextOwnerCount) {
                nextThreshold--;
            }
        } 

        require(nextOwnerCount > 0, "B7");

        return nextThreshold; 
    }
}
