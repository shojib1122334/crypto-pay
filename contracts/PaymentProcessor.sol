// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title PaymentProcessor
 * @dev Polygon Mainnet Smart Contract for Platform-Level Payment Routing (Spec 8, 9)
 * - SafeERC20 for secure transferFrom
 * - Approved token allowlist (Native USDC: 0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359, USDT: 0xc2132D05D31c914a87C6611C10748AaB04B58e8F)
 * - Rejects zero address and zero amount
 * - Emits PaymentCompleted event with paymentId
 * - Emergency pause functionality and access control
 */

interface IERC20 {
    function totalSupply() external view returns (uint256);
    function balanceOf(address account) external view returns (uint256);
    function transfer(address recipient, uint256 amount) external returns (bool);
    function allowance(address owner, address spender) external view returns (uint256);
    function approve(address spender, uint256 amount) external returns (bool);
    function transferFrom(address sender, address recipient, uint256 amount) external returns (bool);
}

library SafeERC20 {
    function safeTransfer(IERC20 token, address to, uint256 value) internal {
        _callOptionalReturn(token, abi.encodeWithSelector(token.transfer.selector, to, value));
    }

    function safeTransferFrom(IERC20 token, address from, address to, uint256 value) internal {
        _callOptionalReturn(token, abi.encodeWithSelector(token.transferFrom.selector, from, to, value));
    }

    function _callOptionalReturn(IERC20 token, bytes memory data) private {
        (bool success, bytes memory returndata) = address(token).call(data);
        require(success, "SafeERC20: low-level call failed");
        if (returndata.length > 0) {
            require(abi.decode(returndata, (bool)), "SafeERC20: ERC20 operation did not succeed");
        }
    }
}

contract PaymentProcessor {
    using SafeERC20 for IERC20;

    address public owner;
    bool public paused;

    // Approved Tokens on Polygon PoS (Spec 4, 9)
    mapping(address => bool) public approvedTokens;

    // Processed payment tracking to prevent double spending
    mapping(bytes32 => bool) public processedPayments;

    event PaymentCompleted(
        bytes32 indexed paymentId,
        address indexed payer,
        address indexed merchant,
        address token,
        uint256 amount
    );

    event TokenApprovalUpdated(address indexed token, bool approved);
    event EmergencyPauseUpdated(bool paused);
    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);

    modifier onlyOwner() {
        require(msg.sender == owner, "PaymentProcessor: caller is not owner");
        _;
    }

    modifier whenNotPaused() {
        require(!paused, "PaymentProcessor: contract is paused");
        _;
    }

    constructor() {
        owner = msg.sender;

        // Native USDC on Polygon
        approvedTokens[0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359] = true;
        // USDT on Polygon
        approvedTokens[0xc2132D05D31c914a87C6611C10748AaB04B58e8F] = true;

        emit TokenApprovalUpdated(0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359, true);
        emit TokenApprovalUpdated(0xc2132D05D31c914a87C6611C10748AaB04B58e8F, true);
    }

    /**
     * @notice Executes a platform-level payment (Spec 9)
     * @param paymentId Unique identifier of the payment
     * @param token Address of the ERC-20 token (must be approved)
     * @param merchant Destination recipient or off-ramp settlement address
     * @param amount Token amount in smallest units
     */
    function pay(
        bytes32 paymentId,
        address token,
        address merchant,
        uint256 amount
    ) external whenNotPaused {
        require(paymentId != bytes32(0), "PaymentProcessor: invalid paymentId");
        require(!processedPayments[paymentId], "PaymentProcessor: payment already processed");
        require(token != address(0), "PaymentProcessor: zero token address");
        require(merchant != address(0), "PaymentProcessor: zero merchant address");
        require(amount > 0, "PaymentProcessor: zero amount");
        require(approvedTokens[token], "PaymentProcessor: token not approved");

        processedPayments[paymentId] = true;

        // Use SafeERC20 transferFrom with minimum required allowance
        IERC20(token).safeTransferFrom(msg.sender, merchant, amount);

        emit PaymentCompleted(paymentId, msg.sender, merchant, token, amount);
    }

    function setTokenApproval(address token, bool approved) external onlyOwner {
        require(token != address(0), "PaymentProcessor: zero address");
        approvedTokens[token] = approved;
        emit TokenApprovalUpdated(token, approved);
    }

    function setPaused(bool _paused) external onlyOwner {
        paused = _paused;
        emit EmergencyPauseUpdated(_paused);
    }

    function transferOwnership(address newOwner) external onlyOwner {
        require(newOwner != address(0), "PaymentProcessor: zero address");
        emit OwnershipTransferred(owner, newOwner);
        owner = newOwner;
    }
}
