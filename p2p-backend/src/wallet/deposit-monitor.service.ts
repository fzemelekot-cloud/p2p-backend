import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { Interval } from '@nestjs/schedule';
import { Wallet } from './entities/wallet.entity';
import { WalletTransaction } from './entities/wallet-transaction.entity';
import { TransactionType } from './enums/transaction-type.enum';
import { TronWeb } from 'tronweb';

@Injectable()
export class DepositMonitorService implements OnApplicationBootstrap {
  private readonly logger = new Logger(DepositMonitorService.name);
  private tronWeb: any;
  private isScanning = false;
  private lastScannedBlock = 0;

  private readonly TARGET_TOKEN_CONTRACT = process.env.TRON_TOKEN_CONTRACT || 'TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t';

  constructor(
    @InjectRepository(Wallet)
    private readonly walletRepository: Repository<Wallet>,
    @InjectRepository(WalletTransaction)
    private readonly transactionRepository: Repository<WalletTransaction>,
    private readonly dataSource: DataSource,
  ) {
    // 💡 Pro Tip: For production, pass an implementation headers object containing TRON-PRO-API-KEY inside your .env
    this.tronWeb = new TronWeb({
      fullHost: process.env.TRON_PROVIDER_URL || 'https://api.trongrid.io',
      headers: process.env.TRON_API_KEY ? { 'TRON-PRO-API-KEY': process.env.TRON_API_KEY } : {},
    });
  }

  async onApplicationBootstrap() {
    try {
      const currentBlock = await this.tronWeb.trx.getCurrentBlock();
      this.lastScannedBlock = currentBlock.block_header.raw_data.number;
      this.logger.log(`Deposit monitor synchronized. Tracking live blocks starting at height: ${this.lastScannedBlock}`);
    } catch (err) {
      this.logger.error('Failed to resolve initial TRON block snapshot height', err.stack);
    }
  }

  // Helper utility to pause execution thread smoothly
  private sleep(ms: number) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * ⏳ Periodic Loop Engine: Runs every 15 seconds
   */
  @Interval(15000)
  async handleBlockScanningLoop() {
    if (this.isScanning) return;
    this.isScanning = true;

    try {
      const currentBlockInfo = await this.tronWeb.trx.getCurrentBlock();
      const latestBlockHeight = currentBlockInfo.block_header.raw_data.number;

      if (latestBlockHeight <= this.lastScannedBlock) {
        this.isScanning = false;
        return;
      }

      // If we are catching up on multiple blocks, space them out to prevent 429s
      for (let i = this.lastScannedBlock + 1; i <= latestBlockHeight; i++) {
        await this.processBlockTransactions(i);
        await this.sleep(1000); // ⏱️ Introduce a clean 1-second delay between network calls
      }

      this.lastScannedBlock = latestBlockHeight;
    } catch (error) {
      this.logger.error('Error identified within block scanner sequence execution loop', error.stack);
    } finally {
      this.isScanning = false;
    }
  }

  private async processBlockTransactions(blockNumber: number) {
    try {
      const block = await this.tronWeb.trx.getBlockByNumber(blockNumber);
      if (!block || !block.transactions) return;

      for (const tx of block.transactions) {
        if (!tx.ret || tx.ret[0].contractRet !== 'SUCCESS') continue;

        const contractInfo = tx.raw_data.contract[0];
        if (contractInfo.type === 'TriggerSmartContract') {
          const value = contractInfo.parameter.value;
          const contractAddress = this.tronWeb.address.fromHex(value.contract_address);

          if (contractAddress === this.TARGET_TOKEN_CONTRACT) {
            await this.parseTrc20Transfer(tx.txID, value.data);
          }
        }
      }
    } catch (err) {
      // Graceful checking if the API rejected it for rate control
      if (err.toString().includes('429')) {
        this.logger.warn(`Rate limited checking block ${blockNumber}. Will retry during next interval cycle.`);
      } else {
        this.logger.error(`Failed to ingest transaction logs for block height: ${blockNumber}`, err.stack);
      }
    }
  }

  private async parseTrc20Transfer(txId: string, dataHex: string) {
    try {
      if (!dataHex || !dataHex.startsWith('a9059cbb')) return;

      const rawToAddressHex = '41' + dataHex.substring(32, 72);
      const rawAmountHex = dataHex.substring(72, 136);

      const targetAddressBase58 = this.tronWeb.address.fromHex(rawToAddressHex);
      const rawUnits = BigInt('0x' + rawAmountHex);
      const computedAmount = Number(rawUnits) / 1_000_000;

      if (computedAmount <= 0) return;

      const matchedWallet = await this.walletRepository.findOne({
        where: { tronDepositAddress: targetAddressBase58 },
      });

      if (matchedWallet) {
        await this.executeCreditWorkflow(matchedWallet.userId, computedAmount, txId);
      }
    } catch (err) {
      this.logger.error(`Parsing routine failure extracting values from TxID: ${txId}`, err.stack);
    }
  }

  private async executeCreditWorkflow(userId: string, amount: number, txHash: string) {
    await this.dataSource.transaction(async (entityManager) => {
      const duplicateTx = await entityManager.findOne(WalletTransaction, {
        where: { referenceHash: txHash },
      });

      if (duplicateTx) {
        this.logger.warn(`Transaction block hash ${txHash} already applied. Skipping execution.`);
        return;
      }

      const wallet = await entityManager.findOne(Wallet, { where: { userId } });
      if (!wallet) return;

      const updatedBalance = parseFloat(wallet.balance) + amount;
      wallet.balance = updatedBalance.toFixed(8);

      await entityManager.save(wallet);

      const newRecord = this.transactionRepository.create({
        walletId: wallet.id,
        userId: wallet.userId,
        type: TransactionType.DEPOSIT,
        amount: amount.toFixed(8),
        referenceHash: txHash,
      });

      await entityManager.save(newRecord);
      this.logger.log(`Successfully credited ${amount} USDT to User: ${userId} via TxHash: ${txHash}`);
    });
  }
}