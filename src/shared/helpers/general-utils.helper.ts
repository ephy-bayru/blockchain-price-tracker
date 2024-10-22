import { Injectable } from '@nestjs/common';

@Injectable()
export class GeneralUtilsHelper {
  truncateAddress(address: string): string {
    return address.length > 10
      ? `${address.slice(0, 6)}...${address.slice(-4)}`
      : address;
  }
}
