export class CreateOfferDto {
  assetType: string;      // e.g., 'USDT'
  totalAmount: string;    // e.g., '100.000000'
  pricePerUnit: string;   // e.g., '250.50'
}