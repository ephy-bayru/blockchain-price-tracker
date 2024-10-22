import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  ManyToOne,
  Index,
  CreateDateColumn,
  UpdateDateColumn,
  JoinColumn,
} from 'typeorm';
import { Token } from './token.entity';

@Entity('prices')
@Index('IDX_price_token_time', ['tokenId', 'timestamp'])
export class Price {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  tokenId: string;

  @ManyToOne(() => Token, (token) => token.prices, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'tokenId' })
  token: Token;

  @Column('decimal', { precision: 18, scale: 8 })
  usdPrice: number;

  @Column('timestamp')
  @Index('IDX_price_timestamp')
  timestamp: Date;

  @Column('decimal', { precision: 5, scale: 2, nullable: true })
  percentageChange1h: number;

  @Column('decimal', { precision: 5, scale: 2, nullable: true })
  percentageChange24h: number;

  @CreateDateColumn({ type: 'timestamp' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamp' })
  updatedAt: Date;
}
