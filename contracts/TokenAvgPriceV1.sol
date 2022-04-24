//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;

import "hardhat/console.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/Pausable.sol";
import "./diamond/libraries/AppStorage.sol";

// @author Eric Bain
// @title A simple token average price getter
contract TokenAvgPriceV1 is Ownable, Pausable {
    AppStorage internal s;

    uint256 public constant SECONDS_IN_A_DAY = 3600 * 24;

    /**
     * @dev set daily price for a day
     * @param timestamp timestamp for a day to set token price
     * @param price token price on the day
     */
    function setDayPrice(uint256 timestamp, uint256 price) external {
        require(isValidTimestamp(timestamp), "Invalid timestamp");
        // console.log("Timestamp validation okay");

        require(s.dailyPrice[timestamp] == 0, "Daily price is already set");
        // console.log("Price for the day is not set yet");

        // The day to set price should be one day after the last record
        require(
            s.lastTimestamp == 0 ||
                (timestamp == s.lastTimestamp + SECONDS_IN_A_DAY),
            "Invalid date increment"
        );
        // console.log("Valid date increment");

        s.dailyPrice[timestamp] = price;
        s.accPrice[timestamp] = s.accPrice[s.lastTimestamp] + price;
        s.lastTimestamp = timestamp;
    }

    /**
     * @dev get token price of a day
     * @param timestamp timestamp for a day to get token price
     * @return token price
     */
    function getDayPrice(uint256 timestamp) public view returns (uint256) {
        require(isValidTimestamp(timestamp), "Invalid timestamp");
        // Check if the daily price is set
        // We can use some third-party libraries like EnumerableMap to accomplish this.
        // Or we can simply assume that the daily price is not set if the return value is zero.
        return s.dailyPrice[timestamp];
    }

    /**
     * @dev gets the average token price for a period
     * @param from timestamp for the start day of the period
     * @param to timestamp for the last day of the period
     * @return average token price within the period [from, to]
     */
    function getAveragePrice(uint256 from, uint256 to)
        public
        view
        returns (uint256)
    {
        require(isValidTimestamp(from), "Invalid timestamp: `from`");
        require(isValidTimestamp(to), "Invalid timestamp: `to`");
        require(to >= from, "Invalid period");
        uint256 dayCount = (to - from) / SECONDS_IN_A_DAY + 1;
        uint256 sum = (s.accPrice[to] - s.accPrice[from] + s.dailyPrice[from]);
        return sum / dayCount;
    }

    function isValidTimestamp(uint256 timestamp) internal pure returns (bool) {
        uint256 dayTimestamp = (timestamp / SECONDS_IN_A_DAY) *
            SECONDS_IN_A_DAY;
        return dayTimestamp == timestamp;
    }

    function getLastTimestamp() public view returns (uint256) {
        return s.lastTimestamp;
    }
}
