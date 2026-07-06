import { MigrationInterface, QueryRunner } from "typeorm";

export class SchemaUpdate1783273609045 implements MigrationInterface {
    name = 'SchemaUpdate1783273609045'

    public async up(queryRunner: QueryRunner): Promise<void> {
        // --- UP ENGINES: Elevate schema to 'VERIFIED_KYC' ---
        
        // 1. Drop constraints and shift to temporary plain text columns
        await queryRunner.query(`ALTER TABLE "users" ALTER COLUMN "status" DROP DEFAULT`);
        await queryRunner.query(`ALTER TABLE "users" ALTER COLUMN "status" TYPE text`);
        await queryRunner.query(`ALTER TABLE "users" ALTER COLUMN "previousStatus" TYPE text`);

        // 2. Clean out old types and prepare the modern enum definitions
        await queryRunner.query(`DROP TYPE IF EXISTS "public"."users_status_enum"`);
        await queryRunner.query(`CREATE TYPE "public"."users_status_enum" AS ENUM('PENDING_KYC', 'VERIFIED_KYC', 'ACTIVE', 'BANNED')`);
        
        await queryRunner.query(`DROP TYPE IF EXISTS "public"."users_previousstatus_enum"`);
        await queryRunner.query(`CREATE TYPE "public"."users_previousstatus_enum" AS ENUM('PENDING_KYC', 'VERIFIED_KYC', 'ACTIVE', 'BANNED')`);

        // 3. Migrate the records smoothly using plain text strings
        await queryRunner.query(`UPDATE "users" SET "status" = 'VERIFIED_KYC' WHERE "status" = 'VERIFIED'`);
        await queryRunner.query(`UPDATE "users" SET "previousStatus" = 'VERIFIED_KYC' WHERE "previousStatus" = 'VERIFIED'`);

        // 4. Cast text fields back to the pristine modern enum matrices
        await queryRunner.query(`ALTER TABLE "users" ALTER COLUMN "status" TYPE "public"."users_status_enum" USING "status"::"public"."users_status_enum"`);
        await queryRunner.query(`ALTER TABLE "users" ALTER COLUMN "status" SET DEFAULT 'PENDING_KYC'`);
        
        await queryRunner.query(`ALTER TABLE "users" ALTER COLUMN "previousStatus" TYPE "public"."users_previousstatus_enum" USING "previousStatus"::"public"."users_previousstatus_enum"`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // --- DOWN ENGINES: Symmetric Rollback back to legacy 'VERIFIED' ---
        
        // 1. Safely disconnect fields from the modern enum by turning them back to text
        await queryRunner.query(`ALTER TABLE "users" ALTER COLUMN "status" DROP DEFAULT`);
        await queryRunner.query(`ALTER TABLE "users" ALTER COLUMN "status" TYPE text`);
        await queryRunner.query(`ALTER TABLE "users" ALTER COLUMN "previousStatus" TYPE text`);

        // 2. Purge the modern enums to clear space for restoration
        await queryRunner.query(`DROP TYPE IF EXISTS "public"."users_status_enum"`);
        await queryRunner.query(`DROP TYPE IF EXISTS "public"."users_previousstatus_enum"`);

        // 3. Recreate the precise legacy enum matrix shapes
        await queryRunner.query(`CREATE TYPE "public"."users_status_enum" AS ENUM('PENDING_KYC', 'VERIFIED', 'BANNED', 'ACTIVE')`);
        await queryRunner.query(`CREATE TYPE "public"."users_previousstatus_enum" AS ENUM('PENDING_KYC', 'VERIFIED', 'ACTIVE', 'BANNED')`);

        // 4. Reverse the data translation (convert 'VERIFIED_KYC' back to historical 'VERIFIED')
        await queryRunner.query(`UPDATE "users" SET "status" = 'VERIFIED' WHERE "status" = 'VERIFIED_KYC'`);
        await queryRunner.query(`UPDATE "users" SET "previousStatus" = 'VERIFIED' WHERE "previousStatus" = 'VERIFIED_KYC'`);

        // 5. Restrap the text fields directly back down into the legacy enum state shapes
        await queryRunner.query(`ALTER TABLE "users" ALTER COLUMN "status" TYPE "public"."users_status_enum" USING "status"::"public"."users_status_enum"`);
        await queryRunner.query(`ALTER TABLE "users" ALTER COLUMN "status" SET DEFAULT 'PENDING_KYC'`);
        
        await queryRunner.query(`ALTER TABLE "users" ALTER COLUMN "previousStatus" TYPE "public"."users_previousstatus_enum" USING "previousStatus"::"public"."users_previousstatus_enum"`);
    }
}