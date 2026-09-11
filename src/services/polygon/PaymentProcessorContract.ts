// PaymentProcessor ABI and constants (Spec 8, 9)

export const PAYMENT_PROCESSOR_ADDRESS = '0x14fB234F0dF679d6F2F55f694F9A67e7E21c1F85';

export const PAYMENT_PROCESSOR_ABI = [
  'function pay(bytes32 paymentId, address token, address merchant, uint256 amount) external',
  'function approvedTokens(address token) external view returns (bool)',
  'function processedPayments(bytes32 paymentId) external view returns (bool)',
  'function paused() external view returns (bool)',
  'event PaymentCompleted(bytes32 indexed paymentId, address indexed payer, address indexed merchant, address token, uint256 amount)',
  'event TokenApprovalUpdated(address indexed token, bool approved)',
  'event EmergencyPauseUpdated(bool paused)',
];
