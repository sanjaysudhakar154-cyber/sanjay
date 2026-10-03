import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('Seeding database...')

  // 1. Create a dummy user
  const user = await prisma.user.upsert({
    where: { email: 'demo@trader.com' },
    update: {},
    create: {
      email: 'demo@trader.com',
      name: 'Demo Trader',
      baseCurrency: 'USD',
      experience: 'Intermediate',
      riskPerTrade: 1.0,
    },
  })

  // 2. Create a dummy account
  const account = await prisma.account.create({
    data: {
      userId: user.id,
      name: 'Main Trading Account',
      startingBalance: 10000,
      currentBalance: 10000,
    },
  })

  // 3. Create strategies
  const breakout = await prisma.strategy.create({
    data: { userId: user.id, name: 'Breakout', description: 'Trading S/R breakouts' },
  })
  const pullback = await prisma.strategy.create({
    data: { userId: user.id, name: 'Pullback', description: 'Trading pullbacks in trends' },
  })
  const reversal = await prisma.strategy.create({
    data: { userId: user.id, name: 'Reversal', description: 'Reversion to mean' },
  })

  const strategies = [breakout, pullback, reversal]
  const markets = ['Forex', 'Crypto', 'Stocks', 'Gold', 'Meme Coins']
  const assets = {
    'Forex': ['EUR/USD', 'GBP/USD', 'USD/JPY'],
    'Crypto': ['BTC', 'ETH', 'SOL'],
    'Stocks': ['AAPL', 'TSLA', 'NVDA'],
    'Gold': ['XAU/USD'],
    'Meme Coins': ['DOGE', 'PEPE']
  }

  // 4. Generate ~100 realistic dummy trades
  let currentBalance = 10000;
  
  for (let i = 0; i < 100; i++) {
    // Determine if it's a win, loss, or breakeven
    const r = Math.random();
    let outcome = 'win';
    if (r > 0.55) outcome = 'loss';
    if (r > 0.90) outcome = 'breakeven';

    const market = markets[Math.floor(Math.random() * markets.length)];
    // @ts-ignore
    const marketAssets = assets[market];
    const asset = marketAssets[Math.floor(Math.random() * marketAssets.length)];
    const strategy = strategies[Math.floor(Math.random() * strategies.length)];
    
    const riskAmount = currentBalance * 0.01; // 1% risk
    let netPnL = 0;
    let rMultiple = 0;

    if (outcome === 'win') {
      rMultiple = 1 + (Math.random() * 2); // 1R to 3R winner
      netPnL = riskAmount * rMultiple;
    } else if (outcome === 'loss') {
      rMultiple = -1 * (0.8 + (Math.random() * 0.4)); // -0.8R to -1.2R loser
      netPnL = riskAmount * rMultiple;
    } else {
      rMultiple = 0;
      netPnL = (Math.random() * 10) - 5; // small positive or negative amount for fees
    }

    currentBalance += netPnL;

    // Date generation (last 90 days)
    const daysAgo = Math.floor(Math.random() * 90);
    const date = new Date();
    date.setDate(date.getDate() - daysAgo);

    await prisma.trade.create({
      data: {
        userId: user.id,
        accountId: account.id,
        date: date,
        market: market,
        asset: asset,
        direction: Math.random() > 0.5 ? 'Long' : 'Short',
        entryPrice: 100 + (Math.random() * 1000), // Dummy price
        positionSize: 1.0,
        riskAmount: riskAmount,
        riskPercentage: 1.0,
        exitPrice: 100 + (Math.random() * 1000),
        exitDate: date,
        grossPnL: netPnL, // Simplified
        fees: Math.random() * 5,
        netPnL: netPnL,
        actualRMultiple: rMultiple,
        strategyId: strategy.id,
        followedPlan: Math.random() > 0.2, // 80% followed plan
        emotionBefore: Math.random() > 0.8 ? 'FOMO' : 'Calm',
      }
    })
  }

  // Update account balance
  await prisma.account.update({
    where: { id: account.id },
    data: { currentBalance: currentBalance }
  })

  console.log('Database seeded successfully.')
}

main()
  .then(async () => {
    await prisma.$disconnect()
  })
  .catch(async (e) => {
    console.error(e)
    await prisma.$disconnect()
    process.exit(1)
  })
