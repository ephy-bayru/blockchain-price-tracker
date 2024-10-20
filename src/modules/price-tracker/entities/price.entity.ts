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
@Index(['token', 'timestamp'])
export class Price {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Token, (token) => token.prices)
  @JoinColumn({ name: 'tokenId' })
  token: Token;

  @Column()
  tokenId: string;

  @Column('decimal', { precision: 18, scale: 8 })
  usdPrice: number;

  @Column('timestamp')
  @Index()
  timestamp: Date;

  @Column('decimal', { precision: 5, scale: 2, nullable: true })
  percentageChange1h: number;

  @Column('decimal', { precision: 5, scale: 2, nullable: true })
  percentageChange24h: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
