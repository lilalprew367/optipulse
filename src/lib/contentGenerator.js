// Auto Content for X and Substack
export async function generateXThread(trade) {
  return `🚨 OptiPulse Auto Trade\n${trade.ticker} ${trade.type}\nThesis: ${trade.thesis.substring(0,150)}...\nChart Review: ${trade.chartReview}\nStatus: ${trade.status}`;
}

export async function generateSubstackPost() {
  // Weekly summary with wins/losses
}