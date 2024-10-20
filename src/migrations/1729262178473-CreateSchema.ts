import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateSchema1729262178473 implements MigrationInterface {
    name = 'CreateSchema1729262178473'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "prices" DROP CONSTRAINT "FK_d115c2ff1ef8ea164a5db79dac3"`);
        await queryRunner.query(`ALTER TABLE "user_price_alerts" DROP CONSTRAINT "FK_e7ba9b75df9be6d31bf84306097"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_TOKEN_ADDRESS"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_TOKEN_ADDRESS_CHAIN"`);
        await queryRunner.query(`ALTER TABLE "prices" ALTER COLUMN "createdAt" SET DEFAULT now()`);
        await queryRunner.query(`ALTER TABLE "prices" ALTER COLUMN "updatedAt" SET DEFAULT now()`);
        await queryRunner.query(`ALTER TABLE "tokens" DROP COLUMN "chain"`);
        await queryRunner.query(`ALTER TABLE "tokens" ADD "chain" character varying NOT NULL`);
        await queryRunner.query(`ALTER TABLE "tokens" ALTER COLUMN "createdAt" SET DEFAULT now()`);
        await queryRunner.query(`ALTER TABLE "tokens" ALTER COLUMN "updatedAt" SET DEFAULT now()`);
        await queryRunner.query(`ALTER TABLE "user_price_alerts" DROP COLUMN "chain"`);
        await queryRunner.query(`ALTER TABLE "user_price_alerts" ADD "chain" character varying NOT NULL`);
        await queryRunner.query(`ALTER TABLE "user_price_alerts" ALTER COLUMN "createdAt" SET DEFAULT now()`);
        await queryRunner.query(`ALTER TABLE "user_price_alerts" ALTER COLUMN "updatedAt" SET DEFAULT now()`);
        await queryRunner.query(`ALTER TABLE "significant_price_alerts" DROP COLUMN "chain"`);
        await queryRunner.query(`ALTER TABLE "significant_price_alerts" ADD "chain" character varying NOT NULL`);
        await queryRunner.query(`ALTER TABLE "significant_price_alerts" ALTER COLUMN "createdAt" SET DEFAULT now()`);
        await queryRunner.query(`ALTER TABLE "significant_price_alerts" ALTER COLUMN "updatedAt" SET DEFAULT now()`);
        await queryRunner.query(`CREATE INDEX "IDX_14e8c4532a977f1aa5af64aeee" ON "prices" ("timestamp") `);
        await queryRunner.query(`CREATE INDEX "IDX_4e22658bde99d3a556a29d69d8" ON "prices" ("tokenId", "timestamp") `);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_8887c0fb937bc0e9dc36cb62f3" ON "tokens" ("address") `);
        await queryRunner.query(`CREATE INDEX "IDX_bf64057ac6184f81ae7efb7e8a" ON "tokens" ("chain") `);
        await queryRunner.query(`ALTER TABLE "tokens" ADD CONSTRAINT "UQ_4a3c52f687626fe4cd843ec79d8" UNIQUE ("address", "chain")`);
        await queryRunner.query(`ALTER TABLE "prices" ADD CONSTRAINT "FK_d115c2ff1ef8ea164a5db79dac3" FOREIGN KEY ("tokenId") REFERENCES "tokens"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "user_price_alerts" ADD CONSTRAINT "FK_e7ba9b75df9be6d31bf84306097" FOREIGN KEY ("tokenAddress") REFERENCES "tokens"("address") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "user_price_alerts" DROP CONSTRAINT "FK_e7ba9b75df9be6d31bf84306097"`);
        await queryRunner.query(`ALTER TABLE "prices" DROP CONSTRAINT "FK_d115c2ff1ef8ea164a5db79dac3"`);
        await queryRunner.query(`ALTER TABLE "tokens" DROP CONSTRAINT "UQ_4a3c52f687626fe4cd843ec79d8"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_bf64057ac6184f81ae7efb7e8a"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_8887c0fb937bc0e9dc36cb62f3"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_4e22658bde99d3a556a29d69d8"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_14e8c4532a977f1aa5af64aeee"`);
        await queryRunner.query(`ALTER TABLE "significant_price_alerts" ALTER COLUMN "updatedAt" SET DEFAULT CURRENT_TIMESTAMP`);
        await queryRunner.query(`ALTER TABLE "significant_price_alerts" ALTER COLUMN "createdAt" SET DEFAULT CURRENT_TIMESTAMP`);
        await queryRunner.query(`ALTER TABLE "significant_price_alerts" DROP COLUMN "chain"`);
        await queryRunner.query(`ALTER TABLE "user_price_alerts" ALTER COLUMN "updatedAt" SET DEFAULT CURRENT_TIMESTAMP`);
        await queryRunner.query(`ALTER TABLE "user_price_alerts" ALTER COLUMN "createdAt" SET DEFAULT CURRENT_TIMESTAMP`);
        await queryRunner.query(`ALTER TABLE "user_price_alerts" DROP COLUMN "chain"`);
        await queryRunner.query(`ALTER TABLE "tokens" ALTER COLUMN "updatedAt" SET DEFAULT CURRENT_TIMESTAMP`);
        await queryRunner.query(`ALTER TABLE "tokens" ALTER COLUMN "createdAt" SET DEFAULT CURRENT_TIMESTAMP`);
        await queryRunner.query(`ALTER TABLE "tokens" DROP COLUMN "chain"`);
        await queryRunner.query(`ALTER TABLE "prices" ALTER COLUMN "updatedAt" SET DEFAULT CURRENT_TIMESTAMP`);
        await queryRunner.query(`ALTER TABLE "prices" ALTER COLUMN "createdAt" SET DEFAULT CURRENT_TIMESTAMP`);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_TOKEN_ADDRESS_CHAIN" ON "tokens" ("address", "chain") `);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_TOKEN_ADDRESS" ON "tokens" ("address") `);
        await queryRunner.query(`ALTER TABLE "user_price_alerts" ADD CONSTRAINT "FK_e7ba9b75df9be6d31bf84306097" FOREIGN KEY ("tokenAddress") REFERENCES "tokens"("address") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "prices" ADD CONSTRAINT "FK_d115c2ff1ef8ea164a5db79dac3" FOREIGN KEY ("tokenId") REFERENCES "tokens"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
    }

}
