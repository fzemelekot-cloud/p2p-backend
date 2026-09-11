import { MigrationInterface, QueryRunner } from 'typeorm';

export class AlignUsdtPrecision1783600000000 implements MigrationInterface {
  name = 'AlignUsdtPrecision1783600000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // This corrective migration intentionally targets only tables that exist
    // in the current database. Offers/orders are created later by the
    // authoritative schema migration and are not altered here.
    await queryRunner.query(`
      DO $$
      DECLARE
        actual_precision integer;
        actual_scale integer;
        offending_count bigint;
      BEGIN
        SELECT numeric_precision, numeric_scale
        INTO actual_precision, actual_scale
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'wallets'
          AND column_name = 'balance';

        IF actual_precision IS DISTINCT FROM 18 OR actual_scale IS DISTINCT FROM 8 THEN
          RAISE EXCEPTION
            'Unexpected wallets.balance definition: expected NUMERIC(18,8), found NUMERIC(%,%)',
            actual_precision, actual_scale;
        END IF;

        SELECT numeric_precision, numeric_scale
        INTO actual_precision, actual_scale
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'wallets'
          AND column_name = 'lockedBalance';

        IF actual_precision IS DISTINCT FROM 18 OR actual_scale IS DISTINCT FROM 8 THEN
          RAISE EXCEPTION
            'Unexpected wallets.lockedBalance definition: expected NUMERIC(18,8), found NUMERIC(%,%)',
            actual_precision, actual_scale;
        END IF;

        SELECT numeric_precision, numeric_scale
        INTO actual_precision, actual_scale
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'wallet_transactions'
          AND column_name = 'amount';

        IF actual_precision IS DISTINCT FROM 18 OR actual_scale IS DISTINCT FROM 8 THEN
          RAISE EXCEPTION
            'Unexpected wallet_transactions.amount definition: expected NUMERIC(18,8), found NUMERIC(%,%)',
            actual_precision, actual_scale;
        END IF;

        SELECT numeric_precision, numeric_scale
        INTO actual_precision, actual_scale
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'withdrawals'
          AND column_name = 'amount';

        IF actual_precision IS DISTINCT FROM 20 OR actual_scale IS DISTINCT FROM 8 THEN
          RAISE EXCEPTION
            'Unexpected withdrawals.amount definition: expected NUMERIC(20,8), found NUMERIC(%,%)',
            actual_precision, actual_scale;
        END IF;

        SELECT COUNT(*)
        INTO offending_count
        FROM wallets
        WHERE balance <> ROUND(balance, 6);

        IF offending_count > 0 THEN
          RAISE EXCEPTION
            'wallets.balance contains % value(s) with non-zero precision beyond 6 decimals',
            offending_count;
        END IF;

        SELECT COUNT(*)
        INTO offending_count
        FROM wallets
        WHERE "lockedBalance" <> ROUND("lockedBalance", 6);

        IF offending_count > 0 THEN
          RAISE EXCEPTION
            'wallets.lockedBalance contains % value(s) with non-zero precision beyond 6 decimals',
            offending_count;
        END IF;

        SELECT COUNT(*)
        INTO offending_count
        FROM wallet_transactions
        WHERE amount <> ROUND(amount, 6);

        IF offending_count > 0 THEN
          RAISE EXCEPTION
            'wallet_transactions.amount contains % value(s) with non-zero precision beyond 6 decimals',
            offending_count;
        END IF;

        SELECT COUNT(*)
        INTO offending_count
        FROM withdrawals
        WHERE amount <> ROUND(amount, 6);

        IF offending_count > 0 THEN
          RAISE EXCEPTION
            'withdrawals.amount contains % value(s) with non-zero precision beyond 6 decimals',
            offending_count;
        END IF;
      END $$;
    `);

    await queryRunner.query(`
      ALTER TABLE "wallets"
      ALTER COLUMN "balance" TYPE NUMERIC(20,6)
      USING "balance"
    `);

    await queryRunner.query(`
      ALTER TABLE "wallets"
      ALTER COLUMN "lockedBalance" TYPE NUMERIC(20,6)
      USING "lockedBalance"
    `);

    await queryRunner.query(`
      ALTER TABLE "wallet_transactions"
      ALTER COLUMN "amount" TYPE NUMERIC(20,6)
      USING "amount"
    `);

    await queryRunner.query(`
      ALTER TABLE "withdrawals"
      ALTER COLUMN "amount" TYPE NUMERIC(20,6)
      USING "amount"
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "wallets"
      ALTER COLUMN "balance" TYPE NUMERIC(18,8)
      USING "balance"
    `);

    await queryRunner.query(`
      ALTER TABLE "wallets"
      ALTER COLUMN "lockedBalance" TYPE NUMERIC(18,8)
      USING "lockedBalance"
    `);

    await queryRunner.query(`
      ALTER TABLE "wallet_transactions"
      ALTER COLUMN "amount" TYPE NUMERIC(18,8)
      USING "amount"
    `);

    await queryRunner.query(`
      ALTER TABLE "withdrawals"
      ALTER COLUMN "amount" TYPE NUMERIC(20,8)
      USING "amount"
    `);
  }
}
