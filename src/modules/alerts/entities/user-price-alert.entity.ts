import { Token } from '../../price-tracker/entities/token.entity';
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';

@Entity('user_price_alerts')
export class UserPriceAlert {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  tokenAddress: string;

  @Column()
  chain: string;

  @Column('decimal', { precision: 18, scale: 8 })
  targetPrice: number;

  @Column()
  condition: 'above' | 'below';

  @Column()
  userEmail: string;

  @Column({ default: true })
  isActive: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @ManyToOne(() => Token)
  @JoinColumn({ name: 'tokenAddress', referencedColumnName: 'address' })
  token: Token;
}
