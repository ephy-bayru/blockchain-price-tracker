import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
  Index,
  Unique,
} from 'typeorm';
import { Price } from './price.entity';

@Entity('tokens')
@Unique(['address', 'chain'])
export class Token {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  @Index({ unique: true })
  address: string;

  @Column()
  symbol: string;

  @Column()
  name: string;

  @Column()
  @Index()
  chain: string;

  @Column({ nullable: true, type: 'int' })
  decimals: number | null;

  @OneToMany(() => Price, (price) => price.token)
  prices: Price[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
