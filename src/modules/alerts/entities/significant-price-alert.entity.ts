import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('significant_price_alerts')
export class SignificantPriceAlert {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  chain: string;

  @Column('decimal', { precision: 5, scale: 2 })
  thresholdPercentage: number;

  @Column()
  timeFrame: number; // in minutes

  @Column()
  recipientEmail: string;

  @Column({ type: 'timestamp' })
  lastCheckedAt: Date;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
