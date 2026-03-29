// Solana Pay URL generator
// Creates deep links for Solana wallets (Phantom, Backpack, etc.)

const NOVA_WALLET = '75Pxyr1sbvBDwNqZgu4Kmk9HQthbCerKF3j2vhMFTqG3'

export function getNovaWallet(): string {
  return NOVA_WALLET
}

export function createPaymentUrl(amountSol: number, skillId: string, skillName: string): string {
  // Solana Pay URL scheme - opens user's wallet app
  const url = `solana:${NOVA_WALLET}?amount=${amountSol}&label=Nova+AI+Agent&message=Payment+for+${encodeURIComponent(skillName)}&reference=${skillId}`
  return url
}

export function getExplorerUrl(txSignature: string): string {
  return `https://solscan.io/tx/${txSignature}`
}

export function getWalletExplorerUrl(wallet: string): string {
  return `https://solscan.io/account/${wallet}`
}
