// SPDX-License-Identifier: LGPL-3.0-only
pragma solidity >=0.7.0 <0.9.0;
import "./Ballot.sol";

/// @title OnlyManager - authorizes ballot contract to perform owner-related actions
contract OnlyManager {
  address internal manager;

  modifier onlyManager() {
    requireManager();
    _;
  }

  function requireManager() private view {
    require(msg.sender == manager, "GS031");
  }

  function setManager(address _manager) internal {
      Ballot ballot = Ballot(_manager);
      ballot.connectSafe();
      manager = _manager;
  }
}
