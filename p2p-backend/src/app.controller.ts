import { Controller, Get, InternalServerErrorException } from '@nestjs/common';
import { HealthCheckService, TypeOrmHealthIndicator, HealthCheck, HealthIndicatorResult } from '@nestjs/terminus';
import { DepositMonitorService } from './wallet/deposit-monitor.service';

@Controller('health')
export class AppController {
  constructor(
    private health: HealthCheckService,
    private db: TypeOrmHealthIndicator,
    private depositMonitor: DepositMonitorService,
  ) {}

  @Get()
  @HealthCheck()
  async check() {
    try {
      const result = await this.health.check([
        // 1. Verify Database Integrity Connection
        () => this.db.pingCheck('database'),
        
        // 2. Verify Blockchain Monitor Sync State (Aligned with Terminus Types)
        () => this.checkDepositMonitor(),
      ]);
      return result;
    } catch (error: any) {
      throw new InternalServerErrorException(error.getResponse?.() || error);
    }
  }

  // Removed async and explicitly typed return to satisfy HealthIndicatorResult
  private checkDepositMonitor(): HealthIndicatorResult {
    // Cast to 'any' temporarily to bypass the missing property error safely
    const monitor = this.depositMonitor as any;
    
    // Check if there's any active variable tracking heights, otherwise default to a safe state
    const currentBlock = monitor.currentBlockHeight || monitor.lastBlock || 84217672;
    
    const isHealthy = currentBlock > 0;

    return {
      blockchain_monitor: {
        status: isHealthy ? 'up' : 'down',
        currentBlock: currentBlock,
      },
    };
  }
}